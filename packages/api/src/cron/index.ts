import type { EmbeddingRunner, JobVectorIndex, SqlDatabase } from '@muicv/shared';

import { planCollectBudget } from './budget.ts';
import { createCmsWriter } from './cms-client.ts';
import { type CollectGroup, type CollectReport, collectOpportunities } from './collect.ts';
import { NICHE_FEEDS, nicheFeedRequests, REMOTIVE_CATEGORIES, SEED_COMPANIES } from './seeds.ts';

/**
 * api worker 的 scheduled 入口：定时采集国际 / 远程技术岗 → CMS opportunities + D1 jobIndex + Vectorize。
 * 频率见 wrangler.jsonc triggers.crons。
 */
export type CollectEnv = {
  AI?: EmbeddingRunner & { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  MUICV_API_DB?: SqlDatabase;
  JOBS_INDEX?: JobVectorIndex;
  MUICV_CMS_URL?: string;
  /** CMS 采集账号的 Payload API key（wrangler secret） */
  CMS_API_KEY?: string;
  JOBS_MAX_AGE_DAYS?: string;
  JOBS_MAX_NEW_PER_RUN?: string;
  /** 'off' 关闭地域限制 LLM 兜底 */
  JOBS_LOCATION_LLM?: string;
  /** 单次运行子请求预算：Paid 计划 1000，Free 50（默认 900 留余量） */
  JOBS_SUBREQUEST_BUDGET?: string;
};

/** 垂直岗位板的 cron 表达式（北京时间 08:00 / 20:00）；其余触发器跑 ATS 组 */
export const NICHE_CRON = '0 0,12 * * *';

export function groupForCron(cron: string | undefined): CollectGroup {
  return cron === NICHE_CRON ? 'niche' : 'ats';
}

export async function runScheduledCollect(
  env: CollectEnv,
  now = new Date(),
  group: CollectGroup = 'ats',
): Promise<CollectReport | null> {
  // secret 未配置时安静跳过：上线早期先部署、secret 后补，不应每 6 小时报错一次
  if (!env.CMS_API_KEY || !env.MUICV_CMS_URL) {
    console.warn('[jobs-cron] 未配置 CMS_API_KEY / MUICV_CMS_URL，跳过本次采集');
    return null;
  }
  const llmOn = env.JOBS_LOCATION_LLM !== 'off' && Boolean(env.AI);
  const budget = planCollectBudget({
    budget: Number(env.JOBS_SUBREQUEST_BUDGET ?? 900),
    sources: group === 'niche' ? nicheFeedRequests(NICHE_FEEDS) : SEED_COMPANIES.length + REMOTIVE_CATEGORIES.length,
    maxNew: Number(env.JOBS_MAX_NEW_PER_RUN ?? 150),
    maxLlm: llmOn ? 20 : 0,
  });
  return collectOpportunities({
    fetchImpl: fetch,
    cms: createCmsWriter(env.MUICV_CMS_URL, env.CMS_API_KEY),
    db: env.MUICV_API_DB ?? null,
    search: env.AI && env.JOBS_INDEX ? { AI: env.AI, JOBS_INDEX: env.JOBS_INDEX } : null,
    llm: llmOn && env.AI ? env.AI : null,
    now,
    maxAgeDays: Number(env.JOBS_MAX_AGE_DAYS ?? 30),
    maxNewPerRun: budget.maxNew,
    maxLlmPerRun: budget.maxLlm,
    group,
    log: console.log,
  });
}
