import { type BillingInterval, type SubscriptionPlanKey, SUBSCRIPTION_PLANS } from '@muicv/shared';
import type Stripe from 'stripe';

import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { getOrCreateStripeCustomer, getStripe, planKeyToPriceId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout —— 订阅 Checkout（月付 / 年付）。
 *
 * Body: { plan: 'pro' | 'max', interval: 'monthly' | 'yearly' }
 * 返回：{ url } —— 前端 location.href = url 跳到 Stripe hosted Checkout
 *
 * mode='subscription'，metadata.kind='subscription' 用于 webhook 区分一次性补充包。
 * 年付 = Stripe 一年 invoice 一次，invoice.paid 时一次性发整年 token。
 * Checkout 成功后 Stripe 跳回 dashboard，订阅真正生效要等 webhook 回写。
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { plan?: unknown; interval?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid-json' }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== 'pro' && plan !== 'max') {
    return Response.json({ error: 'plan 必须是 pro | max' }, { status: 400 });
  }
  const interval = body.interval ?? 'monthly';
  if (interval !== 'monthly' && interval !== 'yearly') {
    return Response.json({ error: 'interval 必须是 monthly | yearly' }, { status: 400 });
  }

  const currency = getRequestCurrency(request);
  const customerId = await getOrCreateStripeCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const priceId = planKeyToPriceId(plan as SubscriptionPlanKey, interval as BillingInterval, currency);
  const stripe = await getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com';

  const cycleTokens =
    interval === 'monthly'
      ? SUBSCRIPTION_PLANS[plan as SubscriptionPlanKey].monthly.tokens
      : SUBSCRIPTION_PLANS[plan as SubscriptionPlanKey].yearly.tokens;

  // CN 用户订阅暂只能走 card —— Stripe 在我们这个账户硬拒绝 Alipay 进 subscription mode
  // （WeChat Pay 全平台都不支持 recurring）。这意味着 CN 用户当前实际无法走通订阅
  // （这正是本 PR 起因：CN 用户卡被拒）。下一步：做月包/年包一次性 SKU 走 topup 路径（mode=payment）
  // 才能让 CN 用户真正用上 WeChat/Alipay 续 Pro/Max 级别 token。详见 commit 内 TODO。
  const cnyOverrides: Partial<Stripe.Checkout.SessionCreateParams> =
    currency === 'cny'
      ? {
          payment_method_types: ['card'],
          locale: 'zh',
        }
      : {};

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancel`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    ...cnyOverrides,
    metadata: {
      kind: 'subscription',
      userId: session.user.id,
      plan,
      interval,
      cycleTokens: String(cycleTokens),
      currency,
    },
  });

  if (!checkout.url) {
    return Response.json({ error: 'stripe-checkout-no-url' }, { status: 502 });
  }
  return Response.json({ url: checkout.url });
}
