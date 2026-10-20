import { type CapturedJd, fetchCmsOpportunityById, type JobKind, siteIdForHost } from '@muicv/shared';

import { ingestCapturedJd } from './extension-jobs.ts';
import { getConfig } from './store.ts';

/**
 * 岗位库 → 本地 targets/ 的统一导入入口（deep link `muicv://import-jd` 与岗位搜索面板共用）。
 * 落盘后沿用扩展采集的 match → generate 流程。
 */

export type JobDetail = { kind: JobKind; id: string; captured: CapturedJd };

async function loadCommunity(id: string): Promise<CapturedJd | null> {
  const base = getConfig().muicvApiBase.replace(/\/$/, '');
  const res = await fetch(`${base}/jobs/community/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const row = (await res.json()) as {
    canonicalUrl?: string;
    sourceSite?: string;
    title?: string | null;
    company?: string | null;
    location?: string | null;
    employmentType?: string | null;
    markdown?: string;
  };
  if (typeof row.markdown !== 'string' || !row.canonicalUrl) return null;
  return {
    url: row.canonicalUrl,
    canonicalUrl: row.canonicalUrl,
    sourceSite: (row.sourceSite as 'generic') ?? 'generic',
    title: row.title ?? null,
    company: row.company ?? null,
    location: row.location ?? null,
    employmentType: row.employmentType ?? null,
    markdown: row.markdown,
    extractedAt: new Date().toISOString(),
  };
}

async function loadCollected(id: string): Promise<CapturedJd | null> {
  const doc = await fetchCmsOpportunityById(id);
  if (!doc) return null;
  return {
    url: doc.applyUrl,
    canonicalUrl: doc.applyUrl,
    sourceSite: siteIdForHost(new URL(doc.applyUrl).hostname),
    title: doc.title,
    company: doc.company,
    location: doc.location,
    employmentType: doc.employmentType ?? null,
    markdown: doc.descriptionMarkdown,
    extractedAt: new Date().toISOString(),
  };
}

export async function loadJobDetail(kind: JobKind, id: string): Promise<CapturedJd | null> {
  return kind === 'community' ? loadCommunity(id) : loadCollected(id);
}

export async function importJobById(kind: JobKind, id: string): Promise<{ targetPath: string }> {
  const captured = await loadJobDetail(kind, id);
  if (!captured) throw new Error('job-not-found');
  const job = await ingestCapturedJd(captured);
  if (!job.targetPath) throw new Error('import-failed');
  return { targetPath: job.targetPath };
}
