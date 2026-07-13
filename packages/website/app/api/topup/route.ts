import { type TopupPackKey, TOPUP_PACKS } from '@muicv/shared';
import type Stripe from 'stripe';

import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { getOrCreateStripeCustomer, getStripe, topupPackToPriceId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/topup —— 一次性补充包 Checkout。
 *
 * Body: { pack: 'small' | 'medium' | 'large' }
 * 返回：{ url } —— 跳 Stripe hosted Checkout，mode='payment'
 *
 * 付款成功 webhook checkout.session.completed (mode='payment') 时，按 metadata.tokens
 * 给 balance +N。metadata.kind='topup' 区分订阅。
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { pack?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid-json' }, { status: 400 });
  }

  const pack = body.pack;
  if (pack !== 'small' && pack !== 'medium' && pack !== 'large') {
    return Response.json({ error: 'pack 必须是 small | medium | large' }, { status: 400 });
  }

  const currency = getRequestCurrency(request);
  const customerId = await getOrCreateStripeCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const priceId = topupPackToPriceId(pack as TopupPackKey, currency);
  const stripe = await getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com';

  const tokens = TOPUP_PACKS[pack as TopupPackKey].tokens;
  // CN topup（一次性付款）三方齐开。WeChat Pay 在 Hosted Checkout 需 client='web'。
  const cnyOverrides: Partial<Stripe.Checkout.SessionCreateParams> =
    currency === 'cny'
      ? {
          payment_method_types: ['wechat_pay', 'alipay', 'card'],
          payment_method_options: { wechat_pay: { client: 'web' } },
          locale: 'zh',
        }
      : {};

  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?topup=success`,
    cancel_url: `${baseUrl}/dashboard?topup=cancel`,
    ...cnyOverrides,
    metadata: {
      kind: 'topup',
      userId: session.user.id,
      pack,
      tokens: String(tokens),
      currency,
    },
  });

  if (!checkout.url) {
    return Response.json({ error: 'stripe-checkout-no-url' }, { status: 502 });
  }
  return Response.json({ url: checkout.url });
}
