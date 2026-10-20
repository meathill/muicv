import { htmlToText } from '@muicv/shared';

import type { CandidateJob } from './types.ts';

/** schema.org JobPosting（JSON-LD）→ 候选岗位。免费、确定性。 */

type Json = Record<string, unknown>;

function asObj(v: unknown): Json | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : null;
}

function str(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  const o = asObj(v);
  return o ? str(o.name ?? o['@value']) : '';
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
}

function isJobPosting(o: Json): boolean {
  return list(o['@type']).some((t) => typeof t === 'string' && /jobposting/i.test(t));
}

/** 展开 @graph / 数组 / 嵌套 itemListElement，收集所有 JobPosting 节点。 */
function collect(node: unknown, out: Json[], depth = 0): void {
  if (depth > 5 || out.length >= 50) return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out, depth + 1);
    return;
  }
  const o = asObj(node);
  if (!o) return;
  if (isJobPosting(o)) {
    out.push(o);
    return;
  }
  collect(o['@graph'], out, depth + 1);
  collect(o.itemListElement, out, depth + 1);
  collect(o.item, out, depth + 1);
}

function placeText(place: unknown): string {
  const p = asObj(place);
  if (!p) return str(place);
  const addr = asObj(p.address);
  if (!addr) return str(p.address) || str(p.name);
  return [addr.addressLocality, addr.addressRegion, addr.addressCountry].map(str).filter(Boolean).join(', ');
}

function locationOf(o: Json): { location: string; remote: boolean } {
  const remote = list(o.jobLocationType).some((t) => /telecommute|remote/i.test(str(t)));
  const places = list(o.jobLocation).map(placeText).filter(Boolean);
  const applicant = list(o.applicantLocationRequirements).map(placeText).filter(Boolean);
  const parts = [...places, ...applicant];
  if (remote) parts.unshift('Remote');
  return { location: [...new Set(parts)].join(' | '), remote };
}

export function jobsFromJsonLd(nodes: unknown[], pageUrl: string): CandidateJob[] {
  const found: Json[] = [];
  collect(nodes, found);
  return found.flatMap((o) => {
    const title = str(o.title) || str(o.name);
    const company = str(o.hiringOrganization);
    if (!title) return [];
    const { location, remote } = locationOf(o);
    const description = str(o.description);
    return [
      {
        title,
        company,
        location,
        workplaceHint: remote ? 'remote' : undefined,
        url: str(o.url) || pageUrl,
        body: /<[a-z][\s\S]*>/i.test(description) ? htmlToText(description) : description,
        employmentType: list(o.employmentType).map(str).filter(Boolean).join(', ') || undefined,
      },
    ];
  });
}

/** 从抓回来的 HTML 里取 <script type="application/ld+json">。 */
export function jsonLdFromHtml(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      out.push(JSON.parse(m[1] ?? ''));
    } catch {
      /* 坏 JSON-LD 忽略 */
    }
    if (out.length >= 20) break;
  }
  return out;
}
