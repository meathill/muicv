import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

/**
 * 缓存栈（对齐 OpenNext 官方 small-site 推荐）：
 * - R2 incremental cache + regional cache（long-lived）：ISR 条目跨区命中提速
 * - DO Queue：时间型 revalidation（revalidate=3600 的 posts / sitemap / ISR 页面）后台排队执行
 * - enableCacheInterception：设为 false，防御 Next 16.3.x + OpenNext 下可见 <Link> 循环发起 _rsc 请求
 *   导致 Worker 请求风暴（详见 dyqr#47 及 opennextjs-cloudflare#1348）
 *
 * 刻意不加 tag cache / cache purge：站点不用 revalidateTag / revalidatePath，
 * 时间型 revalidation 用不到按需失效链路。
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  queue: doQueue,
  enableCacheInterception: false,
});
