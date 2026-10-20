/** 岗位文本工具：HTML → 纯文本、摘要、去重指纹、embedding 输入。 */

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITY_MAP[m] ?? m)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

/** 极简 HTML → markdown-ish 纯文本。Greenhouse content 是转义过的 HTML，需先 decode。 */
export function htmlToText(html: string): string {
  const decoded = /&lt;\w/.test(html) ? decodeEntities(html) : html;
  return decodeEntities(
    decoded
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|div|h[1-6]|ul|ol|li)>|<br\s*\/?>/gi, '\n')
      .replace(/<h[1-6][^>]*>/gi, '\n## ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export function summarize(text: string, max = 200): string {
  const flat = text
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

function normalizePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|corp|co)\.?\b/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/** company + title 指纹：跨来源去重的主键（同公司同职位视为同一岗位）。 */
export function jobFingerprint(company: string, title: string): string {
  return `${normalizePart(company)}|${normalizePart(title)}`;
}

/** url 指纹：同一原帖。 */
export function jobUrlKey(url: string): string {
  return normalizeUrl(url);
}

/** embedding 输入：标题/公司/地点权重靠前，正文截断控制 token。 */
export function buildEmbeddingText(job: { title: string; company: string; location: string; body: string }): string {
  return `${job.title}\n${job.company}\n${job.location}\n${summarize(job.body, 1500)}`;
}
