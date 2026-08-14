import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';

/**
 * CMS 缓存栈：regional cache 提速 R2 读取 + cache interception 缓存命中不走 Worker JS。
 * 不加 DO Queue / tag cache——Payload admin 没有时间型 / 按需 revalidation。
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  enableCacheInterception: true,
});
