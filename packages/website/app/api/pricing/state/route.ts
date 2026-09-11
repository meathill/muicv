import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { getActiveSubscription } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pricing/state —— pricing 页动态数据一次拿齐。
 *
 * Pricing 页面是静态壳（ISR），登录态 / 订阅状态 / 币种由这个接口在客户端补齐，
 * 页面本身不再碰 D1 / Better Auth。
 *
 * 响应：
 *   200 { isLoggedIn, hasActiveSub, currency }
 * 含用户数据；no-store 由 next.config 的 /api/:path* 全局规则提供。
 */
export async function GET(request: Request) {
  const session = await getCurrentSession();
  const userId = session?.user?.id;
  const currency = getRequestCurrency(request);

  let hasActiveSub = false;
  if (userId) {
    hasActiveSub = !!(await getActiveSubscription(userId));
  }

  return Response.json({
    isLoggedIn: !!userId,
    hasActiveSub,
    currency,
  });
}
