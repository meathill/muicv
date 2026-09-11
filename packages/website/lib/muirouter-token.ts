import {
  HsmError,
  hsmDelete,
  hsmGet,
  hsmPut,
  MuirouterOauthError,
  muirouterHsmPath,
  refreshAccessToken,
  type StoredMuirouterTokens,
} from '@muicv/shared';
import { eq } from 'drizzle-orm';

import { getDb, schema } from './db';
import { getHsmConfig } from './hsm-config';
import { getMuirouterOauthConfig } from './muirouter-config';

/**
 * 提前 60 秒视为过期，避免请求发出时刚好踩在边界上被 muirouter 拒。
 */
const REFRESH_LEEWAY_MS = 60 * 1000;

export type FreshAccessToken = {
  accessToken: string;
  expiresAt: Date;
  /** true：触发了 refresh 并已写回 HSM。 */
  rotated: boolean;
};

/**
 * 给定 userId，返回有效 access_token。即将过期则自动用 refresh_token 续期、
 * 把整对新 token 写回 HSM、把 expiresAt 写回 D1。
 *
 * 没绑定 muirouter 返回 null（HSM 没该 path 或 D1 没该行）。
 */
export async function getFreshMuirouterAccessToken(userId: string): Promise<FreshAccessToken | null> {
  const db = await getDb();
  const row = (await db.select().from(schema.muirouterLink).where(eq(schema.muirouterLink.userId, userId)).limit(1))[0];
  if (!row) return null;

  const hsm = await getHsmConfig();
  const path = muirouterHsmPath(userId);
  const raw = await hsmGet(hsm, path);
  if (!raw) return null;
  let stored: StoredMuirouterTokens;
  try {
    stored = JSON.parse(raw) as StoredMuirouterTokens;
  } catch {
    throw new HsmError('invalid-stored-token', 'HSM 里 muirouter token JSON 损坏', 500);
  }

  const now = Date.now();
  if (row.tokenExpiresAt.getTime() - REFRESH_LEEWAY_MS > now) {
    return { accessToken: stored.accessToken, expiresAt: row.tokenExpiresAt, rotated: false };
  }

  // 过期或将过期 → 用 refresh_token 换新
  const oauthConfig = await getMuirouterOauthConfig();
  let token;
  try {
    token = await refreshAccessToken({
      endpoints: oauthConfig.endpoints,
      client: oauthConfig.client,
      refreshToken: stored.refreshToken,
      now,
    });
  } catch (err) {
    if (err instanceof MuirouterOauthError && (err.status === 400 || err.status === 401)) {
      // refresh_token 也失效了——清掉 HSM + D1，逼用户重新走 OAuth
      await hsmDelete(hsm, path).catch(() => {});
      await db.delete(schema.muirouterLink).where(eq(schema.muirouterLink.userId, userId));
    }
    throw err;
  }

  // 整对替换写回 HSM
  const next: StoredMuirouterTokens = { accessToken: token.accessToken, refreshToken: token.refreshToken };
  await hsmPut(hsm, path, JSON.stringify(next));

  const expiresAt = new Date(token.tokenExpiresAt);
  await db
    .update(schema.muirouterLink)
    .set({
      tokenExpiresAt: expiresAt,
      scope: token.scope,
    })
    .where(eq(schema.muirouterLink.userId, userId));

  return { accessToken: token.accessToken, expiresAt, rotated: true };
}
