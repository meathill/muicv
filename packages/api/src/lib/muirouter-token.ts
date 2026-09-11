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

/**
 * Worker 端 muirouter OAuth token 管理：从 HSM 读 access/refresh，按需 refresh，
 * 把新 token 整对写回 HSM、把过期时间写回 D1。
 *
 * 与 packages/website/lib/muirouter-token.ts 对称——区别只是 worker 用 raw D1 prepare
 * 而不是 drizzle，并且通过显式 env 拿 HSM secret，不走 OpenNext context。
 */

const REFRESH_LEEWAY_MS = 60 * 1000;

const DEFAULT_TOKEN_URL = 'https://api.muirouter.com/oauth/token';
const DEFAULT_HSM_BASE = 'https://hsm.meathill.com';

export type MuirouterEnv = {
  MUICV_API_DB: D1Database;
  MUIROUTER_OAUTH_CLIENT_SECRET: string;
  MUIROUTER_OAUTH_TOKEN_URL?: string;
  MUIROUTER_OAUTH_CLIENT_ID?: string;
  HSM_SECRET: string;
  HSM_BASE_URL?: string;
};

type LinkRow = {
  tokenExpiresAt: number;
  defaultModel: string;
};

export type MuirouterUpstreamCreds = {
  accessToken: string;
  defaultModel: string;
};

const SELECT_LINK_SQL = `SELECT tokenExpiresAt, defaultModel FROM muirouterLink WHERE userId = ? LIMIT 1`;

const UPDATE_TOKEN_SQL = `UPDATE muirouterLink SET tokenExpiresAt = ?, scope = ? WHERE userId = ?`;

const DELETE_LINK_SQL = `DELETE FROM muirouterLink WHERE userId = ?`;

function hsmConfig(env: MuirouterEnv): { baseUrl: string; secret: string } {
  return { baseUrl: env.HSM_BASE_URL ?? DEFAULT_HSM_BASE, secret: env.HSM_SECRET };
}

export async function getMuirouterUpstreamCreds(
  env: MuirouterEnv,
  userId: string,
): Promise<MuirouterUpstreamCreds | null> {
  const row = await env.MUICV_API_DB.prepare(SELECT_LINK_SQL).bind(userId).first<LinkRow | null>();
  if (!row) return null;

  const hsm = hsmConfig(env);
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
  if (row.tokenExpiresAt - REFRESH_LEEWAY_MS > now) {
    return { accessToken: stored.accessToken, defaultModel: row.defaultModel };
  }

  // 过期 → refresh + 整对替换写回 HSM + 写回 D1 元数据
  let token;
  try {
    token = await refreshAccessToken({
      endpoints: { tokenUrl: env.MUIROUTER_OAUTH_TOKEN_URL ?? DEFAULT_TOKEN_URL },
      client: { clientId: env.MUIROUTER_OAUTH_CLIENT_ID ?? 'muicv', clientSecret: env.MUIROUTER_OAUTH_CLIENT_SECRET },
      refreshToken: stored.refreshToken,
      now,
    });
  } catch (err) {
    if (err instanceof MuirouterOauthError && (err.status === 400 || err.status === 401)) {
      // refresh_token 也失效 → 清 HSM + D1，逼用户重新走 OAuth
      await hsmDelete(hsm, path).catch(() => {});
      await env.MUICV_API_DB.prepare(DELETE_LINK_SQL).bind(userId).run();
    }
    throw err;
  }

  const next: StoredMuirouterTokens = { accessToken: token.accessToken, refreshToken: token.refreshToken };
  await hsmPut(hsm, path, JSON.stringify(next));
  await env.MUICV_API_DB.prepare(UPDATE_TOKEN_SQL).bind(token.tokenExpiresAt, token.scope, userId).run();

  return { accessToken: token.accessToken, defaultModel: row.defaultModel };
}
