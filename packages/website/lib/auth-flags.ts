import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * 服务端检查哪些 OAuth provider 已配齐 secret。给 sign-in / sign-up 页
 * 决定显不显示对应按钮用。如果两份 secret 缺一就当未启用。
 */
export async function getAuthFlags() {
  const { env } = await getCloudflareContext({ async: true });
  return {
    githubEnabled: !!(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  };
}
