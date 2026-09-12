import { defineCloudflareConfig } from '@opennextjs/cloudflare';

/**
 * CMS 不使用 ISR 或 R2 增量缓存；媒体仍通过独立的 MUICV_CMS_MEDIA binding 访问 R2。
 */
export default defineCloudflareConfig({
  enableCacheInterception: false,
});
