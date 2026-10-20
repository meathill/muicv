import { sha256Hex } from '@muicv/shared';

import { type FetchLike, type SafeFetchResult, safeFetch } from './safe-fetch.ts';

/** jobLinkCache：同一链接 6 小时内不重复抓取（多人提交同一招聘板时省子请求）。 */

export const LINK_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** 缓存里存的正文上限（字符），D1 单行别太大。 */
const CACHE_BODY_CAP = 200_000;

export type LinkFetcher = (url: string) => Promise<SafeFetchResult>;

export function cachedLinkFetcher(db: D1Database, fetchImpl: FetchLike, now = Date.now()): LinkFetcher {
  return async function fetchLink(url: string): Promise<SafeFetchResult> {
    const urlHash = await sha256Hex(url);
    const hit = await db
      .prepare('SELECT status, contentType, body, url, fetchedAt FROM jobLinkCache WHERE urlHash = ? LIMIT 1')
      .bind(urlHash)
      .first<{ status: number; contentType: string; body: string; url: string; fetchedAt: number }>()
      .catch(() => null);
    if (hit && now - hit.fetchedAt < LINK_CACHE_TTL_MS) {
      return { status: hit.status, contentType: hit.contentType, body: hit.body, finalUrl: hit.url };
    }
    const res = await safeFetch(fetchImpl, url).catch(
      (): SafeFetchResult => ({ status: 0, contentType: '', body: '', finalUrl: url }),
    );
    const body = res.body.slice(0, CACHE_BODY_CAP);
    await db
      .prepare(
        `INSERT INTO jobLinkCache (urlHash, url, status, contentType, body, fetchedAt) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(urlHash) DO UPDATE SET url = excluded.url, status = excluded.status,
           contentType = excluded.contentType, body = excluded.body, fetchedAt = excluded.fetchedAt`,
      )
      .bind(urlHash, res.finalUrl, res.status, res.contentType, body, now)
      .run()
      .catch(() => {});
    return { ...res, body };
  };
}
