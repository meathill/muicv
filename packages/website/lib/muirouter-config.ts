import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * 集中读 muirouter OAuth 相关环境变量，给 endpoints / client / redirectUri 一个统一来源。
 * 默认值跟随 muirouter 生产域名；wrangler.jsonc / .dev.vars 可覆盖（联调换 mock 服务）。
 */

const DEFAULTS = {
  authorizeUrl: 'https://muirouter.com/oauth/authorize',
  tokenUrl: 'https://api.muirouter.com/oauth/token',
  revokeUrl: 'https://api.muirouter.com/oauth/revoke',
  clientId: 'muicv',
} as const;

const REDIRECT_PATH = '/api/muirouter/oauth/callback';

export type MuirouterOauthConfig = {
  endpoints: { authorizeUrl: string; tokenUrl: string; revokeUrl: string };
  client: { clientId: string; clientSecret: string };
  redirectUri: string;
};

export async function getMuirouterOauthConfig(): Promise<MuirouterOauthConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const clientSecret = env.MUIROUTER_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error('MUIROUTER_OAUTH_CLIENT_SECRET 未配置，OAuth 流程不可用');
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_BETTER_AUTH_URL 未配置，无法生成 OAuth redirect_uri');
  }
  return {
    endpoints: {
      authorizeUrl: process.env.NEXT_PUBLIC_MUIROUTER_OAUTH_AUTHORIZE_URL || DEFAULTS.authorizeUrl,
      tokenUrl: process.env.NEXT_PUBLIC_MUIROUTER_OAUTH_TOKEN_URL || DEFAULTS.tokenUrl,
      revokeUrl: process.env.NEXT_PUBLIC_MUIROUTER_OAUTH_REVOKE_URL || DEFAULTS.revokeUrl,
    },
    client: {
      clientId: process.env.NEXT_PUBLIC_MUIROUTER_OAUTH_CLIENT_ID || DEFAULTS.clientId,
      clientSecret,
    },
    redirectUri: new URL(REDIRECT_PATH, baseUrl).toString(),
  };
}
