import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/portal —— 跳 Stripe Customer Portal。
 *
 * 由 Portal 接管：取消订阅 / 切换支付方式 / 看历史发票 / 切换月卡档位。
 * 在 Stripe dashboard 后台勾选哪些功能开放。
 *
 * 用户必须先有 stripeCustomerId（点过 checkout 或 topup）才能进 portal；
 * 没有就提示先升级。
 */
export async function POST() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const rows = await db
    .select({ stripeCustomerId: schema.subscription.stripeCustomerId })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, session.user.id))
    .limit(1);
  const customerId = rows[0]?.stripeCustomerId;
  if (!customerId) {
    return Response.json(
      { error: 'no-customer', message: '还没买过任何东西，无需进入账单中心。先订阅或买补充包吧。' },
      { status: 400 },
    );
  }

  const stripe = await getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'https://muicv.com';

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard`,
  });
  return Response.json({ url: portal.url });
}
