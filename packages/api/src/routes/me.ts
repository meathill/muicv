import { microToDisplay, planFromPriceId } from '@muicv/shared';
import type { Context } from 'hono';

import { ensureBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';

const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * GET /me —— 桌面 app / skill 用 mui_ key 拉取登录用户信息。
 *
 * 用于：
 *   - 桌面 app 启动时验证 key 是否有效（验证失败 → 跳到登录页）
 *   - 显示"已登录为 <email>"
 *   - 决定是否引导用户去 dashboard 绑 muirouter（hasBYOK=false）
 *   - 余额信息（dashboard 卡片 + 桌面 app 状态栏）
 *
 * 此处 ensureBalance 是注册赠送的 lazy init 入口之一（另一处在 website /api/me）：
 * 第一次任何客户端访问时建 tokenBalance 行 + 写一条 signup_bonus 流水。
 */
export async function handleMe(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const user = await c.env.MUICV_API_DB.prepare('SELECT id, email, name, image FROM user WHERE id = ? LIMIT 1')
    .bind(userId)
    .first<{ id: string; email: string; name: string | null; image: string | null } | null>();

  if (!user) {
    // mui_ key 合法但 user 行被删了（极少见，比如用户注销后 cascade 没跑干净）
    return c.json({ error: 'user-not-found' }, 401);
  }

  const [link, wallet, sub] = await Promise.all([
    c.env.MUICV_API_DB.prepare(
      `SELECT muirouterEmail, defaultModel, currency, balanceCents, balanceUpdatedAt
       FROM muirouterLink WHERE userId = ? LIMIT 1`,
    )
      .bind(userId)
      .first<{
        muirouterEmail: string | null;
        defaultModel: string;
        currency: string | null;
        balanceCents: number | null;
        balanceUpdatedAt: number | null;
      } | null>(),
    ensureBalance(c.env, userId),
    c.env.MUICV_API_DB.prepare(
      'SELECT status, stripePriceId, monthlyTokens, currentPeriodEnd, cancelAtPeriodEnd FROM subscription WHERE userId = ? LIMIT 1',
    )
      .bind(userId)
      .first<{
        status: string;
        stripePriceId: string | null;
        monthlyTokens: number | null;
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: number;
      } | null>(),
  ]);

  let plan: 'free' | 'pro' | 'max' = 'free';
  if (sub && ACTIVE_SUB_STATUSES.has(sub.status) && sub.stripePriceId) {
    const resolved = planFromPriceId(sub.stripePriceId);
    if (resolved) plan = resolved;
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split('@')[0] ?? '朋友',
    image: user.image ?? null,
    plan,
    hasBYOK: !!link,
    muirouter: link
      ? {
          email: link.muirouterEmail,
          defaultModel: link.defaultModel,
          currency: link.currency,
          balanceCents: link.balanceCents,
          balanceUpdatedAt: link.balanceUpdatedAt,
        }
      : null,
    balance: microToDisplay(wallet.balance),
    subscription: sub
      ? {
          status: sub.status,
          monthlyTokens: sub.monthlyTokens,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
        }
      : null,
  });
}
