import { Readability } from '@mozilla/readability';
import { JOB_SUBMIT_CLIENT_MARKDOWN_CAP, JOB_SUBMIT_MAX_LINKS } from '@muicv/shared';
import TurndownService from 'turndown';

/**
 * 在页面里抽取提交所需的最小信息：Readability 正文 → markdown（截断）、标题、URL、
 * JobPosting JSON-LD、外链列表。不上传整页 HTML。
 */

export type ExtractedPage = {
  url: string;
  title: string;
  markdown: string;
  jsonLd: unknown[];
  links: Array<{ url: string; text: string }>;
};

function hasJobPosting(node: unknown, depth = 0): boolean {
  if (depth > 6 || typeof node !== 'object' || node === null) return false;
  if (Array.isArray(node)) return node.some((n) => hasJobPosting(n, depth + 1));
  const o = node as Record<string, unknown>;
  const types = Array.isArray(o['@type']) ? o['@type'] : [o['@type']];
  if (types.some((t) => typeof t === 'string' && /jobposting/i.test(t))) return true;
  return (
    hasJobPosting(o['@graph'], depth + 1) ||
    hasJobPosting(o.itemListElement, depth + 1) ||
    hasJobPosting(o.item, depth + 1)
  );
}

/** 只保留含 JobPosting 的 JSON-LD 块，其它（面包屑、组织信息、广告）不上传。 */
export function jobPostingJsonLd(doc: Document): unknown[] {
  const out: unknown[] = [];
  for (const el of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const data: unknown = JSON.parse(el.textContent ?? '');
      if (hasJobPosting(data)) out.push(data);
    } catch {
      /* 坏 JSON-LD 忽略 */
    }
    if (out.length >= 20) break;
  }
  return out;
}

export function outboundLinks(doc: Document, baseUrl: string): Array<{ url: string; text: string }> {
  const seen = new Set<string>();
  const out: Array<{ url: string; text: string }> = [];
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    let href: URL;
    try {
      href = new URL(a.getAttribute('href') ?? '', baseUrl);
    } catch {
      continue;
    }
    if (href.protocol !== 'https:' && href.protocol !== 'http:') continue;
    href.hash = '';
    const key = href.toString();
    if (seen.has(key) || key === baseUrl) continue;
    seen.add(key);
    out.push({ url: key, text: (a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) });
    if (out.length >= JOB_SUBMIT_MAX_LINKS) break;
  }
  return out;
}

function toMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  td.remove(['script', 'style', 'noscript', 'iframe', 'form']);
  // 图片对岗位识别无用，只占长度
  td.addRule('dropImages', { filter: 'img', replacement: () => '' });
  return td
    .turndown(html)
    .replace(/^([ \t]*)([-*]|\d+\.)[ \t]{2,}/gm, '$1$2 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function capText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastBreak = cut.lastIndexOf('\n');
  return `${lastBreak > max * 0.8 ? cut.slice(0, lastBreak) : cut}\n\n…（已截断）`;
}

export function extractPage(doc: Document, url: string, maxChars = JOB_SUBMIT_CLIENT_MARKDOWN_CAP): ExtractedPage {
  const clone = doc.cloneNode(true) as Document;
  const article = new Readability(clone, { charThreshold: 200 }).parse();
  const html = article?.content || doc.body?.innerHTML || '';
  const markdown = capText(toMarkdown(html), maxChars);
  const title = (article?.title || doc.title || '').trim().slice(0, 300);
  return { url, title, markdown, jsonLd: jobPostingJsonLd(doc), links: outboundLinks(doc, url) };
}
