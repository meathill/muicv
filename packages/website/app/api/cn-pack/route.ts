import { type CnPackKey, CN_PACKS, cnPackPeriod } from '@muicv/shared';

import { getCnPackCooldownEnd } from '@/lib/cn-pack';
import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { cnPackToPriceId, getOrCreateStripeCustomer, getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cn-pack —— CN 月包/年包一次性 Checkout（绕开 Stripe 不支持 alipay/wechat recurring）。
 *
 * Body: { pack: 'pro-monthly' | 'pro-yearly' | 'max-monthly' | 'max-yearly' }
 *
 * 准入：
 *   1. 已登录
 *   2. currency=='cny'（cookie 或 cf-ipcountry）；USD 用户走订阅，不允许误购 CN 包
 *   3. 同 period（month/year）当前无 cooldown
 *
 * 响应：
 *   200 { url } 跳 Stripe hosted Checkout（mode=payment + WeChat + Alipay + Card）
 *   409 { error: 'cooldown', cooldownEnd } 同周期还有未到期的包
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
  if (typeof pack !== 'string' || !(pack in CN_PACKS)) {
    return Response.json({ error: 'pack 必须是 pro-monthly | pro-yearly | max-monthly | max-yearly' }, { status: 400 });
  }
  const packKey = pack as CnPackKey;

  const currency = getRequestCurrency(request);
  if (currency !== 'cny') {
    return Response.json({ error: 'CN 包仅供国内用户购买；请先切换币种到 ¥ CN' }, { status: 400 });
  }

  const cooldownEnd = await getCnPackCooldownEnd(session.user.id, cnPackPeriod(packKey));
  if (cooldownEnd) {
    return Response.json(
      {
        error: 'cooldown',
        message: `当前周期还未结束，下次可购买：${cooldownEnd.toLocaleDateString('zh-CN')}`,
        cooldownEnd: cooldownEnd.toISOString(),
      },
      { status: 409 },
    );
  }

  const customerId = await getOrCreateStripeCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const priceId = cnPackToPriceId(packKey);
  const stripe = await getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com';

  const tokens = CN_PACKS[packKey].tokens;
  const checkout = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_types: ['wechat_pay', 'alipay', 'card'],
    payment_method_options: { wechat_pay: { client: 'web' } },
    locale: 'zh',
    success_url: `${baseUrl}/dashboard?cnpack=success`,
    cancel_url: `${baseUrl}/dashboard?cnpack=cancel`,
    metadata: {
      kind: 'cn_pack',
      userId: session.user.id,
      pack: packKey,
      tokens: String(tokens),
      currency: 'cny',
    },
  });

  if (!checkout.url) {
    return Response.json({ error: 'stripe-checkout-no-url' }, { status: 502 });
  }
  return Response.json({ url: checkout.url });
}
