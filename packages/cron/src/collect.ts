import {
  buildEmbeddingText,
  type IndexableJob,
  indexJobs,
  type JobSearchEnv,
  jobVectorId,
  type OpportunityInput,
} from '@muicv/shared';

import type { CmsWriter } from './cms-client.ts';
import { normalizeJob, type RawJob } from './normalize.ts';
import { REMOTIVE_CATEGORIES, SEED_COMPANIES, type SeedCompany } from './seeds.ts';
import { fetchAshby, fetchGreenhouse, fetchLever } from './sources/ats.ts';
import type { FetchLike } from './sources/fetch-json.ts';
import { fetchRemotive } from './sources/remotive.ts';

export type CollectOptions = {
  fetchImpl: FetchLike;
  cms: CmsWriter;
  search: JobSearchEnv | null;
  now: Date;
  /** 只收这么多天内发布的岗位，超过即过期 */
  maxAgeDays: number;
  /** 单次最多新建条数，控制 subrequest 数 */
  maxNewPerRun: number;
  seeds?: SeedCompany[];
  remotiveCategories?: string[];
  log?: (message: string) => void;
};

export type CollectReport = {
  fetched: number;
  created: number;
  skippedDuplicate: number;
  skippedOld: number;
  expired: number;
  indexed: number;
  errors: string[];
};

const FETCHERS = { greenhouse: fetchGreenhouse, lever: fetchLever, ashby: fetchAshby } as const;

async function fetchAllRaw(options: CollectOptions, errors: string[]): Promise<RawJob[]> {
  const seeds = options.seeds ?? SEED_COMPANIES;
  const categories = options.remotiveCategories ?? REMOTIVE_CATEGORIES;
  const tasks: Array<Promise<RawJob[]>> = [
    ...seeds.map((seed) => FETCHERS[seed.source](options.fetchImpl, seed)),
    ...categories.map((category) => fetchRemotive(options.fetchImpl, category)),
  ];
  const labels = [...seeds.map((s) => `${s.source}/${s.token}`), ...categories.map((c) => `remotive/${c}`)];
  const results = await Promise.allSettled(tasks);
  return results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    errors.push(`${labels[i]}: ${String(result.reason)}`);
    return [];
  });
}

function toIndexable(id: string, doc: OpportunityInput): IndexableJob {
  return {
    id: jobVectorId('collected', id),
    text: buildEmbeddingText({
      title: doc.title,
      company: doc.company,
      location: doc.location,
      body: doc.descriptionMarkdown,
    }),
    metadata: {
      kind: 'collected',
      refId: id,
      remote: doc.remote,
      region: doc.region,
      category: doc.category,
      postedAt: new Date(doc.postedAt).getTime(),
    },
  };
}

export async function collectOpportunities(options: CollectOptions): Promise<CollectReport> {
  const report: CollectReport = {
    fetched: 0,
    created: 0,
    skippedDuplicate: 0,
    skippedOld: 0,
    expired: 0,
    indexed: 0,
    errors: [],
  };
  const cutoff = new Date(options.now.getTime() - options.maxAgeDays * 86_400_000).toISOString();

  const raw = await fetchAllRaw(options, report.errors);
  report.fetched = raw.length;
  const existing = await options.cms.listExistingKeys(cutoff);

  // 新的在前：配额有限时优先收最新岗位
  const candidates = raw
    .map(normalizeJob)
    .filter((doc): doc is OpportunityInput => doc !== null)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));

  const created: IndexableJob[] = [];
  for (const doc of candidates) {
    if (doc.postedAt < cutoff) {
      report.skippedOld += 1;
      continue;
    }
    if (existing.dedupeKeys.has(doc.dedupeKey) || existing.fingerprints.has(doc.fingerprint)) {
      report.skippedDuplicate += 1;
      continue;
    }
    if (report.created >= options.maxNewPerRun) break;
    try {
      const id = await options.cms.create(doc);
      existing.dedupeKeys.add(doc.dedupeKey);
      existing.fingerprints.add(doc.fingerprint);
      report.created += 1;
      created.push(toIndexable(id, doc));
    } catch (error) {
      report.errors.push(`create ${doc.dedupeKey}: ${String(error)}`);
    }
  }

  const expiredIds = await options.cms.expireBefore(cutoff);
  report.expired = expiredIds.length;

  if (options.search) {
    try {
      report.indexed = await indexJobs(options.search, created);
      if (expiredIds.length) {
        await options.search.JOBS_INDEX.deleteByIds(expiredIds.map((id) => jobVectorId('collected', id)));
      }
    } catch (error) {
      report.errors.push(`vectorize: ${String(error)}`);
    }
  }

  options.log?.(`[cron] ${JSON.stringify(report)}`);
  return report;
}
