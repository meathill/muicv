import { buildAuthorizeUrl, generateOauthState } from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getMuirouterOauthConfig } from '@/lib/muirouter-config';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const STATE_TTL_SECONDS = 300;
const STATE_KV_PREFIX = 'muirouter:oauth:state:';

export type StoredOauthState = {
  userId: string;
  from: 'web' | 'app';
  /** 仅 from='app' 时必填——Electron main 自己生成的 state，回流时透传给 deep link。 */
  appState?: string;
};

export async function GET(request: Request): Promise<Response> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get('from') === 'app' ? 'app' : 'web';
  const appState = url.searchParams.get('app_state')?.trim() ?? '';
  if (from === 'app' && (appState.length < 8 || appState.length > 128)) {
    return Response.json({ error: 'invalid-app-state' }, { status: 400 });
  }

  const config = await getMuirouterOauthConfig();
  const state = generateOauthState();
  const stored: StoredOauthState =
    from === 'app' ? { userId: session.user.id, from, appState } : { userId: session.user.id, from };

  const { env } = await getCloudflareContext({ async: true });
  await env.MUICV_KV.put(`${STATE_KV_PREFIX}${state}`, JSON.stringify(stored), { expirationTtl: STATE_TTL_SECONDS });

  const authorizeUrl = buildAuthorizeUrl({
    endpoints: config.endpoints,
    clientId: config.client.clientId,
    redirectUri: config.redirectUri,
    state,
  });
  return Response.redirect(authorizeUrl, 302);
}
