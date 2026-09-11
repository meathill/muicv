import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getDb, schema } from './db';

/**
 * Stripe SDK 在 Cloudflare Workers 的关键约束：
 *   - 必须用 `Stripe.createFetchHttpClient()`，默认 Node http 在 Workers 跑不了
 *   - webhook 校验必须用 `webhooks.constructEventAsync`（依赖 SubtleCrypto）
 *   - apiVersion 固定一个具体版本，避免 SDK 升级时行为变化
 *
 * priceId 注册表 + 反查函数已下沉到 `@muicv/shared`（website 与 api 共用同一份，
 * 避免两端 price ID 漂移），本文件只保留需要 Stripe SDK / D1 的部分。
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
