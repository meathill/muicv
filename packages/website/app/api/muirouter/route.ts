import { hsmDelete, hsmGet, muirouterHsmPath, revokeToken, type StoredMuirouterTokens } from '@muicv/shared';
import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/lib/db';
import { getHsmConfig } from '@/lib/hsm-config';
import { getMuirouterOauthConfig } from '@/lib/muirouter-config';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

type LinkStatus = {
  linked: boolean;
  email?: string | null;
  linkedAt?: string | undefined;
  defaultModel?: string | undefined;
  scope?: string | null | undefined;
  currency?: string | undefined;
  balanceCents?: number | undefined;
  lifetimeToppedUpCents?: number | null | undefined;
  lifetimeSpentCents?: number | null | undefined;
  balanceUpdatedAt?: string | undefined;
  lastError?: string | undefined;
};

/** GET /api/muirouter —— 当前用户的 muirouter 关联状态（不返回 token 原文）。 */
export async function GET(): Promise<Response> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const row = (
    await db.select().from(schema.muirouterLink).where(eq(schema.muirouterLink.userId, session.user.id)).limit(1)
  )[0];

  const status: LinkStatus = row
    ? {
        linked: true,
        email: row.muirouterEmail,
        linkedAt: row.linkedAt.toISOString(),
        defaultModel: row.defaultModel,
        scope: row.scope,
        currency: row.currency ?? undefined,
        balanceCents: row.balanceCents ?? undefined,
        lifetimeToppedUpCents: row.lifetimeToppedUpCents ?? null,
        lifetimeSpentCents: row.lifetimeSpentCents ?? null,
        balanceUpdatedAt: row.balanceUpdatedAt?.toISOString(),
        lastError: row.lastError ?? undefined,
      }
    : { linked: false };

  return Response.json(status);
}

/**
 * DELETE /api/muirouter —— 解绑。
 * 从 HSM 读 access_token → 调 muirouter /oauth/revoke（best-effort）→ HSM 删 path →
 * D1 删 metadata 行。任一步失败都不阻塞后续——目标是「本地不再持有可用的 token 引用」。
 */
export async function DELETE(): Promise<Response> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const db = await getDb();
  const row = (
    await db.select().from(schema.muirouterLink).where(eq(schema.muirouterLink.userId, session.user.id)).limit(1)
  )[0];
  if (row) {
    const hsm = await getHsmConfig();
    const path = muirouterHsmPath(session.user.id);
    try {
      const raw = await hsmGet(hsm, path);
      if (raw) {
        const stored = JSON.parse(raw) as StoredMuirouterTokens;
        const config = await getMuirouterOauthConfig();
        await revokeToken({ endpoints: config.endpoints, client: config.client, token: stored.accessToken });
      }
    } catch {
      // HSM 读失败 / revoke 失败都不阻塞——下面照样把本地索引清掉
    }
    await hsmDelete(hsm, path).catch(() => {});
    await db.delete(schema.muirouterLink).where(eq(schema.muirouterLink.userId, session.user.id));
  }
  return Response.json({ ok: true });
}
