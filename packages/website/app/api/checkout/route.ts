import { type BillingInterval, type SubscriptionPlanKey, SUBSCRIPTION_PLANS } from '@muicv/shared';

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
 * 只卖 USD：currency='cny' 直接 400（Stripe 本账户不支持 CNY recurring），
 * 引导 CN 用户切美元订阅或买补充包（/api/topup）。
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
  // 人民币不能订阅：Stripe 本账户不支持 CNY recurring（Alipay 进不了 subscription mode，
  // WeChat Pay 全平台不支持 recurring）。CN 用户只能买一次性补充包（TOPUP_PACKS，微信/支付宝/卡）。
  if (currency === 'cny') {
    return Response.json(
      {
        error: 'cny-subscription-unsupported',
        message: '人民币暂不支持订阅（Stripe 限制）。请切换为 $ USD 订阅，或改为购买补充包。',
      },
      { status: 400 },
    );
  }

  const customerId = await getOrCreateStripeCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const priceId = planKeyToPriceId(plan as SubscriptionPlanKey, interval as BillingInterval);
  const stripe = await getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com';

  const cycleTokens =
    interval === 'monthly'
      ? SUBSCRIPTION_PLANS[plan as SubscriptionPlanKey].monthly.tokens
      : SUBSCRIPTION_PLANS[plan as SubscriptionPlanKey].yearly.tokens;

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancel`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
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
