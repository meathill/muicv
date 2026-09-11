import {
  type BillingInterval,
  type Currency,
  type SubscriptionPlanKey,
  type TopupPackKey,
  SUBSCRIPTION_PLANS,
  TOPUP_PACKS,
} from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getDb, schema } from './db';
import {
  STRIPE_SUBSCRIPTION_PRICES,
  STRIPE_TOPUP_PRICES,
  SUBSCRIPTION_PRICE_META,
  TOPUP_PRICE_META,
} from './stripe-prices';

/**
 * Stripe SDK 在 Cloudflare Workers 的关键约束：
 *   - 必须用 `Stripe.createFetchHttpClient()`，默认 Node http 在 Workers 跑不了
 *   - webhook 校验必须用 `webhooks.constructEventAsync`（依赖 SubtleCrypto）
 *   - apiVersion 固定一个具体版本，避免 SDK 升级时行为变化
 */

let cached: Stripe | undefined;

export async function getStripe(): Promise<Stripe> {
  if (cached) return cached;
  const { env } = await getCloudflareContext({ async: true });
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY 未配置（wrangler secret put STRIPE_SECRET_KEY）');
  }
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-08-26.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cached;
}

/**
 * 订阅 plan + interval → Stripe price id（读 lib/stripe-prices.ts 常量）。
 * 订阅只卖 USD（人民币不能 recurring，见 stripe-prices.ts 注释），故不需要 currency 维度。
 */
export function planKeyToPriceId(plan: SubscriptionPlanKey, interval: BillingInterval): string {
  return STRIPE_SUBSCRIPTION_PRICES[plan][interval];
}

export function topupPackToPriceId(pack: TopupPackKey, currency: Currency): string {
  return STRIPE_TOPUP_PRICES[pack][currency];
}

/**
 * Stripe price id → 一个 cycle 上账的 token 数（月付每月，年付每年一次性）。
 * webhook 处理 invoice.paid 时按这个上账。
 * priceId 不在表里就返 null（可能是被人在 Stripe 后台手动绑了未知 price，需告警）。
 */
export function priceIdToCycleTokens(priceId: string): number | null {
  const meta = SUBSCRIPTION_PRICE_META.get(priceId);
  if (!meta) return null;
  return SUBSCRIPTION_PLANS[meta.plan][meta.interval].tokens;
}

/** Stripe price id → ('pro'|'max', 'monthly'|'yearly')。订阅状态卡显示"年付/月付"用。 */
export function priceIdToPlanInterval(
  priceId: string,
): { plan: SubscriptionPlanKey; interval: BillingInterval } | null {
  const meta = SUBSCRIPTION_PRICE_META.get(priceId);
  if (!meta) return null;
  return { plan: meta.plan, interval: meta.interval };
}

/**
 * Stripe price id → 一次性补充包 token 数。webhook 处理 checkout.session.completed
 * (mode=payment) 时按这个上账。USD 与 CNY 同档返同 token。
 */
export function priceIdToTopupTokens(priceId: string): number | null {
  const meta = TOPUP_PRICE_META.get(priceId);
  if (!meta) return null;
  return TOPUP_PACKS[meta.pack].tokens;
}

/**
 * 幂等地为某个 user 拿到 stripe customer id。
 *
 * 流程：
 *   1. 查自家 subscription 表 → 有就直接返
 *   2. 没有 → stripe.customers.create({ metadata: { userId } })
 *   3. 立刻 INSERT subscription 行（status='incomplete', stripeSubscriptionId=null）
 *      —— 这一步必须早于 Checkout，否则用户连续点两次升级会创出两个 customer
 *
 * @returns stripeCustomerId
 */
export async function getOrCreateStripeCustomer(args: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const db = await getDb();
  const existing = await db
    .select({ stripeCustomerId: schema.subscription.stripeCustomerId })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, args.userId))
    .limit(1);
  if (existing[0]?.stripeCustomerId) return existing[0].stripeCustomerId;

  const stripe = await getStripe();
  const customer = await stripe.customers.create({
    email: args.email,
    ...(args.name ? { name: args.name } : {}),
    metadata: { userId: args.userId },
  });

  const now = new Date();
  await db.insert(schema.subscription).values({
    userId: args.userId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: null,
    stripePriceId: null,
    monthlyTokens: null,
    status: 'incomplete',
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return customer.id;
}
