import { htmlToText } from '@muicv/shared';

import type { RawJob } from '../../cron/normalize.ts';
import { ashbyJob, greenhouseJob, leverJob } from '../../cron/sources/ats.ts';
import { asRecord } from '../../cron/sources/fetch-json.ts';
import type { LinkFetcher } from './link-cache.ts';
import type { CandidateJob } from './types.ts';

/** 已知 ATS 岗位页 URL → 公开 API 拿结构化数据（免费、确定性；复用采集器的映射）。 */

export type AtsRef =
  | { kind: 'greenhouse'; board: string; id: string }
  | { kind: 'lever'; board: string; id: string }
  | { kind: 'ashby'; board: string; id: string };

const SLUG = '[A-Za-z0-9][A-Za-z0-9_.-]{0,80}';

export function detectAtsUrl(raw: string): AtsRef | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const m = new RegExp(`^/(${SLUG})/jobs/(\\d+)`).exec(path);
    if (m?.[1] && m[2]) return { kind: 'greenhouse', board: m[1], id: m[2] };
    const board = url.searchParams.get('for');
    const id = url.searchParams.get('token') ?? url.searchParams.get('gh_jid');
    if (board && id && /^\d+$/.test(id)) return { kind: 'greenhouse', board, id };
    return null;
  }
  if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
    const m = new RegExp(`^/(${SLUG})/([0-9a-f-]{36})`).exec(path);
    return m?.[1] && m[2] ? { kind: 'lever', board: m[1], id: m[2] } : null;
  }
  if (host === 'jobs.ashbyhq.com') {
    const m = new RegExp(`^/(${SLUG})/([0-9a-f-]{36})`).exec(path);
    return m?.[1] && m[2] ? { kind: 'ashby', board: m[1], id: m[2] } : null;
  }
  return null;
}

function apiUrl(ref: AtsRef): string {
  const board = encodeURIComponent(ref.board);
  const id = encodeURIComponent(ref.id);
  if (ref.kind === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`;
  if (ref.kind === 'lever') return `https://api.lever.co/v0/postings/${board}/${id}?mode=json`;
  return `https://api.ashbyhq.com/posting-api/job-board/${board}`;
}

function titleCase(slug: string): string {
  return slug.replace(/[-_.]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function rawToCandidate(raw: RawJob): CandidateJob {
  return {
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: [raw.location, ...(raw.extraLocations ?? [])].filter(Boolean).join(' | '),
    workplaceHint: raw.workplace || raw.isRemote,
    url: raw.applyUrl,
    body: raw.plain?.trim() || (raw.html ? htmlToText(raw.html) : ''),
    employmentType: raw.employmentType,
  };
}

/** 拿不到（下架 / 接口变更）返回 null，交给后续 AI 路径。 */
export async function fetchAtsJob(fetchLink: LinkFetcher, ref: AtsRef): Promise<CandidateJob | null> {
  const res = await fetchLink(apiUrl(ref));
  if (res.status !== 200 || !res.body) return null;
  let data: unknown;
  try {
    data = JSON.parse(res.body);
  } catch {
    return null;
  }
  const company = titleCase(ref.board);
  let raw: RawJob | null = null;
  if (ref.kind === 'greenhouse') raw = greenhouseJob(data, company);
  else if (ref.kind === 'lever') raw = leverJob(data, company);
  else {
    const jobs = asRecord(data).jobs;
    const item = Array.isArray(jobs) ? jobs.find((j) => asRecord(j).id === ref.id) : undefined;
    raw = item ? ashbyJob(item, company) : null;
  }
  if (!raw?.title) return null;
  return rawToCandidate(raw);
}
