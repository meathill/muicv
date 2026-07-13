import {
  type BillingInterval,
  type CnPackKey,
  type Currency,
  type SubscriptionPlanKey,
  type TopupPackKey,
  CN_PACKS,
  SUBSCRIPTION_PLANS,
  TOPUP_PACKS,
} from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getDb, schema } from './db';
import {
  CN_PACK_PRICE_META,
  STRIPE_CN_PACK_PRICES,
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
    apiVersion: '2026-06-24.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cached;
}

/**
 * 订阅 plan + interval + currency → Stripe price id（读 lib/stripe-prices.ts 常量）。
 * 同 plan 同 interval 的 USD / CNY 在 Stripe 里是两个独立 price 对象，token 数相同。
 */
export function planKeyToPriceId(plan: SubscriptionPlanKey, interval: BillingInterval, currency: Currency): string {
  return STRIPE_SUBSCRIPTION_PRICES[plan][interval][currency];
}

export function topupPackToPriceId(pack: TopupPackKey, currency: Currency): string {
  return STRIPE_TOPUP_PRICES[pack][currency];
}

/**
 * Stripe price id → 一个 cycle 上账的 token 数（月付每月，年付每年一次性）。
 * webhook 处理 invoice.paid 时按这个上账。USD 与 CNY 同档返同 token。
 * priceId 不在表里就返 null（可能是被人在 Stripe 后台手动绑了未知 price，需告警）。
 */
export function priceIdToCycleTokens(priceId: string): number | null {
  const meta = SUBSCRIPTION_PRICE_META.get(priceId);
  if (!meta) return null;
  return SUBSCRIPTION_PLANS[meta.plan][meta.interval].tokens;
}

/** Stripe price id → ('pro'|'max', 'monthly'|'yearly')。订阅状态卡显示"年付/月付"用，币种不区分。 */
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

/** CN 月包/年包 key → Stripe price id（live one-time CNY）。 */
export function cnPackToPriceId(pack: CnPackKey): string {
  return STRIPE_CN_PACK_PRICES[pack];
}

/** Stripe price id → CnPackKey；不在表里返 null（用于 webhook 反查）。 */
export function priceIdToCnPack(priceId: string): CnPackKey | null {
  return CN_PACK_PRICE_META.get(priceId)?.pack ?? null;
}

/** CN 月包/年包 price id → token 数（同档对应 SUBSCRIPTION_PLANS 的 cycle tokens）。 */
export function priceIdToCnPackTokens(priceId: string): number | null {
  const pack = priceIdToCnPack(priceId);
  if (!pack) return null;
  return CN_PACKS[pack].tokens;
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
