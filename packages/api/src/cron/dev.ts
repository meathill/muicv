import type { CmsWriter } from './cms-client.ts';
import { collectOpportunities } from './collect.ts';

/**
 * 本地试跑：真实拉取各数据源，但 CMS / Vectorize 用内存假实现，不写任何远端。
 * `pnpm --filter @muicv/api jobs:collect:dry`
 */
const memory: CmsWriter = {
  async listExistingKeys() {
    return { dedupeKeys: new Set(), fingerprints: new Set() };
  },
  async create(doc) {
    console.log(
      `[dry] ${doc.source} | ${doc.company} | ${doc.title} | ${doc.workplace} ${doc.allowedCountries.join('/')} ${doc.allowedRegions.join('/')} ${doc.utcOffsetMin ?? ''}~${doc.utcOffsetMax ?? ''}`,
    );
    return doc.dedupeKey;
  },
  async expireBefore() {
    return [];
  },
};

const report = await collectOpportunities({
  fetchImpl: fetch,
  cms: memory,
  db: null,
  search: null,
  llm: null,
  now: new Date(),
  maxAgeDays: 30,
  maxNewPerRun: 1000,
});
console.log(report);
