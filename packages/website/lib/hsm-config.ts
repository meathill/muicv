import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { HsmConfig } from '@muicv/shared';

const DEFAULT_HSM_BASE = 'https://hsm.meathill.com';

/**
 * 集中读 HSM 服务的 baseUrl + secret。secret 必填（部署时 wrangler secret put 注入）；
 * baseUrl 缺省取生产 hsm.meathill.com，本地联调可在 wrangler.jsonc 覆盖。
 */
export async function getHsmConfig(): Promise<HsmConfig> {
  const { env } = await getCloudflareContext({ async: true });
  const secret = env.HSM_SECRET;
  if (!secret) {
    throw new Error('HSM_SECRET 未配置，无法读写 muirouter token 存储');
  }
  return {
    baseUrl: process.env.NEXT_PUBLIC_HSM_BASE_URL || DEFAULT_HSM_BASE,
    secret,
  };
}
