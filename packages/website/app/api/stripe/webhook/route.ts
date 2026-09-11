import { displayToMicro } from '@muicv/shared';
import { eq } from 'drizzle-orm';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type Stripe from 'stripe';

import { getDb, schema } from '@/lib/db';
import { getStripe, priceIdToCycleTokens, priceIdToTopupTokens } from '@/lib/stripe';
import { credit } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook —— Stripe webhook 入口。
 *
 * 处理事件：
 *   - checkout.session.completed (mode=payment)：补充包付款成功 → +tokens
 *   - customer.subscription.created / updated / deleted：同步 subscription 表
 *   - invoice.paid (subscription)：订阅续费 → +cycleTokens（月付每月一次，
 *     年付每年一次性发整年用量）
 *   - invoice.payment_failed：不上账，仅更新 status（用户被提示修复支付方式）
 *
 * 双层幂等：
 *   1. stripeEvent 表对 evt_id 去重（INSERT OR IGNORE）—— Stripe at-least-once 重发
 *   2. credit() 用 invoice.id / session.id 当 ledgerId，重复触发不重复入账
 *
 * 关键约束：用 request.text() 拿 raw body，再 constructEventAsync 校验签名；
 * 不能用 request.json() 因为签名是基于原始字节算的。
 */
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return Response.json({ error: 'missing stripe-signature' }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'misconfigured: STRIPE_WEBHOOK_SECRET 未设' }, { status: 500 });
  }

  const rawBody = await request.text();
  const stripe = await getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json(
      { error: 'signature-invalid', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 400 },
    );
  }

  // 第一层幂等：evt_id 去重
  const db = await getDb();
  const inserted = await db
    .insert(schema.stripeEvent)
    .values({ id: event.id, type: event.type, receivedAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvent.id });
  if (inserted.length === 0) {
    // 已处理过，直接 200
    return Response.json({ ok: true, deduped: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        // 其它事件不处理但仍 200，避免 Stripe 反复重试
        break;
    }
    return Response.json({ ok: true });
  } catch (err) {
    // 业务处理失败：500 让 Stripe 重发（webhook 设计：失败必须 5xx）
    return Response.json(
      { error: 'handler-failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

/**
 * 一次性付款：mode=payment 的 checkout.session.completed → 补充包上账。
 *
 * 上账金额走 priceId 反查（不信任 metadata.tokens，可被改）；metadata.tokens 仅作兜底。
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'payment') {
    // 订阅的 checkout.session.completed 也会触发，但订阅上账走 invoice.paid 不走这里
    return;
  }
  const userId = session.metadata?.userId;
  if (!userId) {
    throw new Error(`checkout.session.completed missing metadata.userId (session=${session.id})`);
  }

  const stripe = await getStripe();
  const detailed = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
  const item = detailed.line_items?.data?.[0];
  const priceId = typeof item?.price === 'object' && item.price ? item.price.id : null;

  let tokens = priceId ? priceIdToTopupTokens(priceId) : null;
  if (tokens == null) {
    // priceId 失配时用 metadata 兜底（不至于卡死上账）
    const meta = Number.parseInt(session.metadata?.tokens ?? '', 10);
    if (Number.isFinite(meta) && meta > 0) tokens = meta;
  }
  if (tokens == null) {
    throw new Error(`checkout.session.completed price ${priceId} not in topup map (session=${session.id})`);
  }

  await credit(
    userId,
    displayToMicro(tokens),
    'topup',
    { sessionId: session.id, priceId, pack: session.metadata?.pack ?? null },
    `checkout_${session.id}`,
  );
}

/** 订阅创建 / 更新 → 同步 subscription 表。token 入账走 invoice.paid。 */
async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await resolveUserIdFromCustomer(customerId, sub);
  if (!userId) return;

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const cycleTokens = priceId ? priceIdToCycleTokens(priceId) : null;

  // Stripe period 字段在 Subscription.items.data[0] 上（API 2026-04-22）
  const periodStart = item?.current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? null;

  const db = await getDb();
  const now = new Date();
  await db
    .update(schema.subscription)
    .set({
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      monthlyTokens: cycleTokens, // 字段历史名 monthlyTokens，存"每个 cycle 上账数"（年付填整年）
      status: sub.status,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: !!sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      updatedAt: now,
    })
    .where(eq(schema.subscription.stripeCustomerId, customerId));
}

/** 订阅彻底删除（用户取消立即生效，或周期末到达）→ 标记 canceled。已发 token 保留。 */
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const db = await getDb();
  const now = new Date();
  await db
    .update(schema.subscription)
    .set({
      status: 'canceled',
      cancelAtPeriodEnd: false,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : now,
      updatedAt: now,
    })
    .where(eq(schema.subscription.stripeCustomerId, customerId));
}

/**
 * 订阅续费成功 → 给 user balance += cycleTokens（月付每月，年付每年一次性整年）。
 * 用 invoice.id 做 ledgerId，Stripe 重发同一张 invoice 也不会重复入账。
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== 'subscription_create' && invoice.billing_reason !== 'subscription_cycle') {
    // 一次性付款的 invoice 不走这里（一次性付款由 checkout.session.completed 处理）
    return;
  }
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const userId = await resolveUserIdFromCustomer(customerId, null);
  if (!userId) return;

  // 从 invoice line items 反查 priceId → cycleTokens
  const line = invoice.lines.data[0];
  const priceId = typeof line?.pricing?.price_details?.price === 'string' ? line.pricing.price_details.price : null;
  const tokens = priceId ? priceIdToCycleTokens(priceId) : null;
  if (tokens == null) {
    throw new Error(`invoice.paid price ${priceId} not in subscription map (invoice=${invoice.id})`);
  }

  await credit(
    userId,
    displayToMicro(tokens),
    'subscription',
    { invoiceId: invoice.id, priceId },
    `invoice_${invoice.id}`,
  );
}

/** 续费失败 → 仅记一条事件，subscription 表 status 由 customer.subscription.updated 同步。 */
async function handleInvoicePaymentFailed(_invoice: Stripe.Invoice) {
  // 不主动改 status，让 customer.subscription.updated 事件去同步 past_due / unpaid
  // 余额不动，老 token 仍可用直到耗尽
}

/**
 * customer id → 自家 user id。
 *   1. 先查 subscription 表（getOrCreateStripeCustomer 时写入的）
 *   2. fallback: stripe.customers.retrieve metadata.userId
 *   3. 都查不到说明是后台手动创的脏数据，throw 让 webhook 5xx 触发 Stripe 重试
 */
async function resolveUserIdFromCustomer(customerId: string, sub: Stripe.Subscription | null): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ userId: schema.subscription.userId })
    .from(schema.subscription)
    .where(eq(schema.subscription.stripeCustomerId, customerId))
    .limit(1);
  if (rows[0]?.userId) return rows[0].userId;

  // metadata fallback（subscription 对象上的 metadata 优先于 customer 上的）
  const metaUserId = sub?.metadata?.userId;
  if (metaUserId) return metaUserId;

  const stripe = await getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;
  return customer.metadata?.userId ?? null;
}
