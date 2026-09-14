import { type JobSiteId, siteIdForHost } from '@muicv/shared';

import { htmlToMarkdown } from './html-to-md.ts';
import type { QueryRoot } from './query.ts';

export type ExtractedFields = {
  title: string | null;
  company: string | null;
  location: string | null;
  employmentType: string | null;
  markdown: string;
  sourceSite: JobSiteId;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object' && 'name' in value) return str((value as { name: unknown }).name);
  return null;
}

function findJobPosting(nodes: unknown[]): Record<string, unknown> | null {
  const queue = [...nodes];
  while (queue.length) {
    const cur = queue.shift();
    const rec = asRecord(cur);
    if (!rec) continue;
    const type = rec['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'jobposting')) return rec;
    const graph = rec['@graph'];
    if (Array.isArray(graph)) queue.push(...graph);
  }
  return null;
}

export function extractGeneric(q: QueryRoot): ExtractedFields | null {
  const posting = findJobPosting(q.jsonLd());
  if (!posting) return null;
  const descHtml = str(posting.description) ?? '';
  const markdown = descHtml.includes('<') ? htmlToMarkdown(descHtml) : descHtml;
  if (markdown.length < 40) return null;
  let host = 'generic';
  try {
    host = new URL(q.url).hostname;
  } catch {
    /* ignore */
  }
  return {
    title: str(posting.title) ?? q.pageTitle,
    company: str(posting.hiringOrganization),
    location: str(posting.jobLocation) ?? str(asRecord(posting.jobLocation)?.address),
    employmentType: str(posting.employmentType),
    markdown,
    sourceSite: siteIdForHost(host),
  };
}

export function extractBySelectors(
  q: QueryRoot,
  spec: { title: string; company: string; location?: string; body: string },
  sourceSite: JobSiteId,
): ExtractedFields | null {
  const title = q.text(spec.title);
  const bodyHtml = q.html(spec.body);
  const markdown = bodyHtml ? htmlToMarkdown(bodyHtml) : (q.text(spec.body) ?? '');
  if (!title && markdown.length < 80) return null;
  if (markdown.length < 40) return null;
  return {
    title: title ?? q.pageTitle,
    company: q.text(spec.company),
    location: spec.location ? q.text(spec.location) : null,
    employmentType: null,
    markdown,
    sourceSite,
  };
}
