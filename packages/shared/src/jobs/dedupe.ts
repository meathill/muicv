import { jobFingerprint, jobUrlKey } from './text.ts';
import type { JobListing } from './types.ts';

/**
 * 合并展示时去重：同公司 + 同职位，或同一原帖 URL，视为同一岗位，保留先出现的（排序靠前 / 分高）。
 * 只在展示层折叠——社区贡献照常入库、照常发积分，不受采集岗位影响。
 */
export function dedupeListings(items: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  const out: JobListing[] = [];
  for (const item of items) {
    const keys = [`f:${jobFingerprint(item.company, item.title)}`, `u:${jobUrlKey(item.url)}`];
    if (keys.some((k) => seen.has(k))) continue;
    for (const k of keys) seen.add(k);
    out.push(item);
  }
  return out;
}
