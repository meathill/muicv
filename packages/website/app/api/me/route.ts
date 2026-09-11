import { microToDisplay, planFromPriceId } from '@muicv/shared';
import { and, eq, isNull } from 'drizzle-orm';

import { hashApiKey } from '@/lib/api-key';
import { getDb, schema } from '@/lib/db';
import { ensureBalance } from '@/lib/wallet';

const ACTIVE_SUB_STATUSES = new Set(['active', 'trialing', 'past_due']);

export const dynamic = 'force-dynamic';

/**
 * GET /api/me —— 桌面 app 用 mui_ key 拉登录用户信息。
 *
 * 设计意图：
 *   桌面 app 的"登录态校验"只需要查 D1 user/apiKey 表，跟 LLM 代理 / PDF 渲染
 *   没关系。把 /me 放在 website worker（已部署 + 持有 D1）能让登录功能完全
 *   独立于 packages/api 的部署状态——api worker 没上线的时候用户也能登录、
 *   管理 profile，只是聊天会拿到友好的"AI 服务还没连上"提示。
 *
 *   packages/api/src/routes/me.ts 是冗余但兼容的副本（早期版本桌面 app 直接
 *   打 api worker），后续可以下掉。
 *
 * 这里也是注册赠送 lazy init 的入口之一：第一次访问时建 tokenBalance 行 +
 * 写一条 signup_bonus 流水。
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth) {
    return Response.json({ error: 'missing-api-key' }, { status: 401 });
  }
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!m) {
    return Response.json({ error: 'authorization 必须是 "Bearer <key>" 格式' }, { status: 401 });
  }
  const key = m[1] ?? '';
  if (!/^mui_[A-Za-z0-9]{32}$/.test(key)) {
    return Response.json({ error: 'api key 格式不合法' }, { status: 401 });
  }

  const keyHash = await hashApiKey(key);
  const db = await getDb();

  const row = await db
    .select({
      id: schema.apiKey.id,
      userId: schema.apiKey.userId,
    })
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.keyHash, keyHash), isNull(schema.apiKey.revokedAt)))
    .limit(1);

  const apiKeyRow = row[0];
  if (!apiKeyRow) {
    return Response.json({ error: 'api key 无效或已被撤销' }, { status: 401 });
  }

  const userRows = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(eq(schema.user.id, apiKeyRow.userId))
    .limit(1);
  const user = userRows[0];
  if (!user) {
    return Response.json({ error: 'user-not-found' }, { status: 401 });
  }

  const [linkRows, wallet, subRows] = await Promise.all([
    db
      .select({
        userId: schema.muirouterLink.userId,
        muirouterEmail: schema.muirouterLink.muirouterEmail,
        defaultModel: schema.muirouterLink.defaultModel,
        currency: schema.muirouterLink.currency,
        balanceCents: schema.muirouterLink.balanceCents,
        balanceUpdatedAt: schema.muirouterLink.balanceUpdatedAt,
      })
      .from(schema.muirouterLink)
      .where(eq(schema.muirouterLink.userId, user.id))
      .limit(1),
    ensureBalance(user.id),
    db
      .select({
        status: schema.subscription.status,
        stripePriceId: schema.subscription.stripePriceId,
        monthlyTokens: schema.subscription.monthlyTokens,
        currentPeriodEnd: schema.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
      })
      .from(schema.subscription)
      .where(eq(schema.subscription.userId, user.id))
      .limit(1),
  ]);

  // 异步 update lastUsedAt（不 block 响应）
  void db
    .update(schema.apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKey.id, apiKeyRow.id))
    .catch(() => {
      /* 更新失败不影响业务 */
    });

  const sub = subRows[0];
  const link = linkRows[0];

  // 推 plan：必须 status 在活跃集合 + stripePriceId 能映射到已知档位，否则免费。
  let plan: 'free' | 'pro' | 'max' = 'free';
  if (sub && ACTIVE_SUB_STATUSES.has(sub.status) && sub.stripePriceId) {
    const resolved = planFromPriceId(sub.stripePriceId);
    if (resolved) plan = resolved;
  }

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0] || '朋友',
    image: user.image ?? null,
    plan,
    hasBYOK: !!link,
    muirouter: link
      ? {
          email: link.muirouterEmail,
          defaultModel: link.defaultModel,
          currency: link.currency,
          balanceCents: link.balanceCents,
          balanceUpdatedAt: link.balanceUpdatedAt?.getTime() ?? null,
        }
      : null,
    balance: microToDisplay(wallet.balance),
    subscription: sub
      ? {
          status: sub.status,
          monthlyTokens: sub.monthlyTokens,
          currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
          cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
        }
      : null,
  });
}
