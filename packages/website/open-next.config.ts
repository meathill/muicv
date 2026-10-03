import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';
import { withRegionalCache } from '@opennextjs/cloudflare/overrides/incremental-cache/regional-cache';
import doQueue from '@opennextjs/cloudflare/overrides/queue/do-queue';

/**
 * 缓存栈（2026-10 恢复 R2 + 开 Workers Cache）：
 * - R2 incremental cache（site-cache）：ISR / Data Cache 持久层。列表页 revalidate=3600，
 *   详情/营销静态页 revalidate=604800（1 周）。部署时 populateCache 重写 R2。
 * - regional cache（long-lived）：Cache API 区域加速，ISR 条目按区复用 30 分钟，
 *   命中时后台从 R2 懒更新（默认 shouldLazilyUpdateOnCacheHit）。
 * - DO Queue：时间型 revalidation 后台排队执行。
 * - Workers Cache（wrangler [cache] enabled）：边缘 tiered 缓存。Next 按 revalidate 自动
 *   下发 `Cache-Control: s-maxage=<revalidate>`，边缘直接吃；force-dynamic 页自动
 *   `private, no-cache, no-store` 走 BYPASS。新部署换 Worker version，key 默认隔离，
 *   无需手动 purge。
 * - enableCacheInterception：保持 false，防御 Next 16.3.x + OpenNext 下可见 <Link>
 *   循环发起 _rsc 请求导致 Worker 请求风暴（详见 dyqr#47 及 opennextjs-cloudflare#1348）。
 *
 * 刻意不加 tag cache / cache purge：站点不用 revalidateTag / revalidatePath，
 * 时间型 revalidation 用不到按需失效链路。
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: 'long-lived' }),
  queue: doQueue,
  enableCacheInterception: false,
});
