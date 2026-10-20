import type { FetchLike } from './fetch-json.ts';

/**
 * 极简 RSS 2.0 解析：Workers 里没有 DOMParser，岗位板 feed 结构简单，按 <item> 正则切片足够。
 * 支持 CDATA、带命名空间的标签（job:location）、常见 HTML 实体。
 */

export type RssItem = { get(tag: string): string; raw: string };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function escapeTag(tag: string): string {
  return tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tagText(xml: string, tag: string): string {
  const t = escapeTag(tag);
  const m = new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i').exec(xml);
  if (!m?.[1]) return '';
  const inner = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(inner);
  return (cdata ? (cdata[1] ?? '') : decodeEntities(inner)).trim();
}

export function parseRssItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((m) => {
    const raw = m[1] ?? '';
    return { raw, get: (tag: string) => tagText(raw, tag) };
  });
}

export async function fetchRss(fetchImpl: FetchLike, url: string): Promise<RssItem[]> {
  const res = await fetchImpl(url, {
    headers: { accept: 'application/rss+xml, application/xml, text/xml', 'user-agent': 'muicv-jobs-bot/1.0' },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return parseRssItems(await res.text());
}

/** 去掉 utm_* 跟踪参数，得到稳定的原帖链接 */
export function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) if (key.startsWith('utm_')) u.searchParams.delete(key);
    return u.toString();
  } catch {
    return url;
  }
}
