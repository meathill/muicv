import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  exchangeCodeForToken,
  hsmPut,
  muirouterHsmPath,
  MuirouterOauthError,
  type StoredMuirouterTokens,
  type TokenResponse,
} from '@muicv/shared';

import { getDb, schema } from '@/lib/db';
import { getHsmConfig } from '@/lib/hsm-config';
import { fetchMuirouterBalance } from '@/lib/muirouter';
import { getMuirouterOauthConfig } from '@/lib/muirouter-config';
import { getCurrentSession } from '@/lib/session';

import type { StoredOauthState } from '../start/route';

export const dynamic = 'force-dynamic';

const STATE_KV_PREFIX = 'muirouter:oauth:state:';

/**
 * GET /api/muirouter/oauth/callback?code=...&state=...
 *
 * 校验 state（KV 单次消费防重放） → 用 code 换 token → 拉余额快照 →
 * AES-GCM 加密 access/refresh token → upsert muirouterLink → 按来源 302。
 *
 * Web 来源：跳 `/dashboard/muirouter?linked=1`
 * App 来源：跳 `muicv://muirouter-linked?app_state=...&ok=1`，OS 唤起 Electron。
 *
 * 错误（user denied / token 端点失败 / state 不匹配）一律走 errorRedirect，
 * 把人工可读的 reason 拼到 query。前端读 ?error 显示 toast。
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const upstreamError = url.searchParams.get('error');

  if (upstreamError) {
    return errorRedirect({ from: 'web' }, upstreamError);
  }
  if (!code || !state) {
    return errorRedirect({ from: 'web' }, 'missing-code-or-state');
  }

  const { env } = await getCloudflareContext({ async: true });
  const stateKey = `${STATE_KV_PREFIX}${state}`;
  const stateRaw = await env.MUICV_KV.get(stateKey);
  if (!stateRaw) {
    return errorRedirect({ from: 'web' }, 'state-expired-or-invalid');
  }
  // 单次消费：先删，避免并发重放
  await env.MUICV_KV.delete(stateKey);

  let stored: StoredOauthState;
  try {
    stored = JSON.parse(stateRaw) as StoredOauthState;
  } catch {
    return errorRedirect({ from: 'web' }, 'state-malformed');
  }

  // 双重校验：当前浏览器 session 必须是当初发起 OAuth 的那个用户
  const session = await getCurrentSession();
  if (!session?.user || session.user.id !== stored.userId) {
    return errorRedirect(stored, 'session-mismatch');
  }

  const config = await getMuirouterOauthConfig();
  let token: TokenResponse;
  try {
    token = await exchangeCodeForToken({
      endpoints: config.endpoints,
      client: config.client,
      code,
      redirectUri: config.redirectUri,
    });
  } catch (err) {
    const reason = err instanceof MuirouterOauthError ? err.code : 'token-exchange-failed';
    return errorRedirect(stored, reason);
  }

  // 拉一次余额作为绑定时的快照（失败不阻断绑定，只记 lastError）
  const balanceResult = await fetchMuirouterBalance(token.accessToken).catch((err) => ({
    status: 'error' as const,
    message: err instanceof Error ? err.message : 'balance fetch failed',
  }));

  // 把 access + refresh 整对外包给 HSM。失败就直接告诉用户重试——不要把明文落 D1。
  const hsm = await getHsmConfig();
  const tokensPayload: StoredMuirouterTokens = { accessToken: token.accessToken, refreshToken: token.refreshToken };
  try {
    await hsmPut(hsm, muirouterHsmPath(stored.userId), JSON.stringify(tokensPayload));
  } catch {
    return errorRedirect(stored, 'hsm-put-failed');
  }

  const now = new Date();
  const balanceFields =
    balanceResult.status === 'ok'
      ? {
          currency: balanceResult.balance.currency,
          balanceCents: balanceResult.balance.balanceCents,
          lifetimeToppedUpCents: balanceResult.balance.lifetimeToppedUpCents,
          lifetimeSpentCents: balanceResult.balance.lifetimeSpentCents,
          balanceUpdatedAt: balanceResult.balance.updatedAt,
          lastError: null,
        }
      : {
          currency: null,
          balanceCents: null,
          lifetimeToppedUpCents: null,
          lifetimeSpentCents: null,
          balanceUpdatedAt: null,
          lastError: balanceResult.message,
        };

  const metadataFields = {
    tokenExpiresAt: new Date(token.tokenExpiresAt),
    scope: token.scope,
    muirouterUserId: token.user.id,
    muirouterEmail: token.user.email,
    linkedAt: now,
  };

  const db = await getDb();
  await db
    .insert(schema.muirouterLink)
    .values({
      userId: stored.userId,
      ...metadataFields,
      ...balanceFields,
    })
    .onConflictDoUpdate({
      target: schema.muirouterLink.userId,
      set: {
        ...metadataFields,
        ...balanceFields,
      },
    });

  return successRedirect(stored);
}

function successRedirect(stored: StoredOauthState): Response {
  if (stored.from === 'app' && stored.appState) {
    const url = new URL('muicv://muirouter-linked');
    url.searchParams.set('app_state', stored.appState);
    url.searchParams.set('ok', '1');
    return Response.redirect(url.toString(), 302);
  }
  return Response.redirect(absoluteWebUrl('/dashboard/muirouter?linked=1'), 302);
}

function errorRedirect(stored: { from: 'web' | 'app'; appState?: string }, reason: string): Response {
  if (stored.from === 'app' && stored.appState) {
    const url = new URL('muicv://muirouter-linked');
    url.searchParams.set('app_state', stored.appState);
    url.searchParams.set('error', reason);
    return Response.redirect(url.toString(), 302);
  }
  return Response.redirect(absoluteWebUrl(`/dashboard/muirouter?error=${encodeURIComponent(reason)}`), 302);
}

function absoluteWebUrl(path: string): string {
  // 在 worker 里 redirect 字符串可以是相对 URL，但显式拼绝对地址更稳；
  // 实际 URL 由 Better Auth 那一套环境变量提供。
  const base = process.env.PUBLIC_NEXT_SIET_URL ?? process.env.BETTER_AUTH_URL ?? '';
  if (!base) return path;
  return new URL(path, base).toString();
}
