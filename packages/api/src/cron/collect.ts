import {
  indexJobs,
  indexRowToIndexable,
  type JobIndexRow,
  type JobSearchEnv,
  jobVectorId,
  type OpportunityInput,
  opportunityToIndexRow,
  type SqlDatabase,
  setJobIndexStatus,
  upsertJobIndexRows,
} from '@muicv/shared';

import type { CmsWriter } from './cms-client.ts';
import { extractWithLlm, needsLlm, type TextGenerator } from './llm-location.ts';
import { normalizeJob, type RawJob } from './normalize.ts';
import { NICHE_FEEDS, type NicheFeed, REMOTIVE_CATEGORIES, SEED_COMPANIES, type SeedCompany } from './seeds.ts';
import { fetchAshby, fetchGreenhouse, fetchLever } from './sources/ats.ts';
import type { FetchLike } from './sources/fetch-json.ts';
import {
  fetchGolangProjects,
  fetchHimalayas,
  fetchJobicy,
  fetchLaraJobs,
  fetchRemoteOk,
  fetchVueJobs,
  fetchWeWorkRemotely,
} from './sources/niche.ts';
import { fetchRemotive } from './sources/remotive.ts';

export type CollectOptions = {
  fetchImpl: FetchLike;
  cms: CmsWriter;
  /** D1 jobIndex（统一检索的结构化 + FTS 索引） */
  db: SqlDatabase | null;
  search: JobSearchEnv | null;
  /** 地域限制 LLM 兜底；null 关闭 */
  llm: TextGenerator | null;
  now: Date;
  /** 只收这么多天内发布的岗位，超过即过期 */
  maxAgeDays: number;
  /** 单次最多新建条数，控制 subrequest 数 */
  maxNewPerRun: number;
  maxLlmPerRun?: number;
  /** ats：雇主 ATS + Remotive（每 6 小时）；niche：垂直 / 远程岗位板（每天 2 次） */
  group?: CollectGroup;
  seeds?: SeedCompany[];
  remotiveCategories?: string[];
  nicheFeeds?: NicheFeed[];
  log?: (message: string) => void;
};

export type CollectReport = {
  fetched: number;
  created: number;
  skippedDuplicate: number;
  skippedOld: number;
  expired: number;
  indexed: number;
  llmExtracted: number;
  errors: string[];
};

export type CollectGroup = 'ats' | 'niche';

const FETCHERS = { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby } as const;

function fetchNiche(fetchImpl: FetchLike, feed: NicheFeed): Promise<RawJob[]> {
  switch (feed.source) {
    case 'vuejobs':
      return fetchVueJobs(fetchImpl);
    case 'larajobs':
      return fetchLaraJobs(fetchImpl);
    case 'remoteok':
      return fetchRemoteOk(fetchImpl);
    case 'golangprojects':
      return fetchGolangProjects(fetchImpl);
    case 'weworkremotely':
      return fetchWeWorkRemotely(fetchImpl, feed.category);
    case 'jobicy':
      return fetchJobicy(fetchImpl, feed.industry);
    case 'himalayas':
      return fetchHimalayas(fetchImpl, feed.pages);
  }
}

function nicheLabel(feed: NicheFeed): string {
  if (feed.source === 'weworkremotely') return `${feed.source}/${feed.category}`;
  if (feed.source === 'jobicy') return `${feed.source}/${feed.industry}`;
  return feed.source;
}

function buildTasks(options: CollectOptions): { tasks: Array<Promise<RawJob[]>>; labels: string[] } {
  if (options.group === 'niche') {
    const feeds = options.nicheFeeds ?? NICHE_FEEDS;
    return { tasks: feeds.map((f) => fetchNiche(options.fetchImpl, f)), labels: feeds.map(nicheLabel) };
  }
  const seeds = options.seeds ?? SEED_COMPANIES;
  const categories = options.remotiveCategories ?? REMOTIVE_CATEGORIES;
  return {
    tasks: [
      ...seeds.map((seed) => FETCHERS[seed.source](options.fetchImpl, seed)),
      ...categories.map((category) => fetchRemotive(options.fetchImpl, category)),
    ],
    labels: [...seeds.map((s) => `${s.source}/${s.token}`), ...categories.map((c) => `remotive/${c}`)],
  };
}

async function fetchAllRaw(options: CollectOptions, errors: string[]): Promise<RawJob[]> {
  const { tasks, labels } = buildTasks(options);
  const results = await Promise.allSettled(tasks);
  return results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    errors.push(`${labels[i]}: ${String(result.reason)}`);
    return [];
  });
}

export async function collectOpportunities(options: CollectOptions): Promise<CollectReport> {
  const report: CollectReport = {
    fetched: 0,
    created: 0,
    skippedDuplicate: 0,
    skippedOld: 0,
    expired: 0,
    indexed: 0,
    llmExtracted: 0,
    errors: [],
  };
  const cutoff = new Date(options.now.getTime() - options.maxAgeDays * 86_400_000).toISOString();
  const maxLlm = options.maxLlmPerRun ?? 20;

  const raw = await fetchAllRaw(options, report.errors);
  report.fetched = raw.length;
  const existing = await options.cms.listExistingKeys(cutoff);

  // 新的在前：配额有限时优先收最新岗位
  const candidates = raw
    .map(normalizeJob)
    .filter((doc): doc is OpportunityInput => doc !== null)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const rows: JobIndexRow[] = [];
  for (let doc of candidates) {
    if (doc.postedAt < cutoff) {
      report.skippedOld += 1;
      continue;
    }
    if (existing.dedupeKeys.has(doc.dedupeKey) || existing.fingerprints.has(doc.fingerprint)) {
      report.skippedDuplicate += 1;
      continue;
    }
    if (report.created >= options.maxNewPerRun) break;
    if (options.llm && report.llmExtracted < maxLlm && needsLlm(doc)) {
      try {
        doc = await extractWithLlm(options.llm, doc);
        report.llmExtracted += 1;
      } catch (error) {
        report.errors.push(`llm ${doc.dedupeKey}: ${String(error)}`);
      }
    }
    try {
      const id = await options.cms.create(doc);
      existing.dedupeKeys.add(doc.dedupeKey);
      existing.fingerprints.add(doc.fingerprint);
      report.created += 1;
      rows.push(opportunityToIndexRow({ ...doc, id, updatedAt: options.now.toISOString() }, options.now.getTime()));
    } catch (error) {
      report.errors.push(`create ${doc.dedupeKey}: ${String(error)}`);
    }
  }

  const expiredIds = (await options.cms.expireBefore(cutoff)).map((id) => jobVectorId('collected', id));
  report.expired = expiredIds.length;

  if (options.db) {
    try {
      await upsertJobIndexRows(options.db, rows);
      await setJobIndexStatus(options.db, expiredIds, 'expired', options.now.getTime());
    } catch (error) {
      report.errors.push(`jobIndex: ${String(error)}`);
    }
  }

  if (options.search) {
    try {
      report.indexed = await indexJobs(options.search, rows.map(indexRowToIndexable));
      if (expiredIds.length) await options.search.JOBS_INDEX.deleteByIds(expiredIds);
    } catch (error) {
      report.errors.push(`vectorize: ${String(error)}`);
    }
  }

  options.log?.(`[cron] ${JSON.stringify(report)}`);
  return report;
}
