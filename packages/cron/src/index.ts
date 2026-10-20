import type { EmbeddingRunner, JobVectorIndex } from '@muicv/shared';

import { createCmsWriter } from './cms-client.ts';
import { collectOpportunities } from './collect.ts';

/**
 * muicv-cron：定时采集国际 / 远程技术岗 → CMS opportunities → Vectorize。
 * 触发频率见 wrangler.jsonc triggers.crons。
 */
export type CronEnv = {
  AI: EmbeddingRunner;
  JOBS_INDEX: JobVectorIndex;
  MUICV_CMS_URL: string;
  /** CMS 采集账号的 Payload API key（wrangler secret） */
  CMS_API_KEY: string;
  MAX_AGE_DAYS?: string;
  MAX_NEW_PER_RUN?: string;
};

export function runCollect(env: CronEnv, now = new Date()) {
  return collectOpportunities({
    fetchImpl: fetch,
    cms: createCmsWriter(env.MUICV_CMS_URL, env.CMS_API_KEY),
    search: { AI: env.AI, JOBS_INDEX: env.JOBS_INDEX },
    now,
    maxAgeDays: Number(env.MAX_AGE_DAYS ?? 30),
    maxNewPerRun: Number(env.MAX_NEW_PER_RUN ?? 150),
    log: console.log,
  });
}

export default {
  async scheduled(_controller: unknown, env: CronEnv, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(runCollect(env));
  },
};
