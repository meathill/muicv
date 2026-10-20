import {
  type JobSubmitRequest,
  type JobSubmitResponse,
  microToDisplay,
  type SubmittedJob,
  submitAiCostMicro,
} from '@muicv/shared';

import { readBalance } from '../wallet.ts';
import { settleSubmissionBilling } from './billing.ts';
import { type PipelineDeps, type PipelineResult, runSubmitPipeline } from './pipeline.ts';
import { type StoreEnv, storeJobs } from './store.ts';

/**
 * 处理一次提交（同步路径与队列消费者共用）：跑流水线 → 入库 → 结算。
 * 重放安全：入库按 urlHash 去重 / upsert，结算只生效一次（billing.ts），流水 id 固定。
 */

export type SubmissionJob = {
  submissionId: string;
  userId: string;
  request: JobSubmitRequest;
  holdMicro: number;
};

export type ProcessContext = {
  pipeline: PipelineDeps;
  index: (communityId: string) => Promise<void>;
  now: number;
  /** 已识别结果（同步路径的确定性识别）直接复用，避免重复抓取 */
  precomputed?: PipelineResult | null;
  /** 队列消费者：流水线异常时抛出让队列重试，而不是立即按失败结算 */
  throwOnError?: boolean;
};

/** 结算写进 jobSubmission.result 的内容（不含余额，余额在查询时现读）。 */
export type StoredSubmissionResult = Omit<JobSubmitResponse, 'balance'>;

function countBy(jobs: SubmittedJob[], status: SubmittedJob['status']): number {
  return jobs.filter((j) => j.status === status).length;
}

export async function processSubmission(
  env: StoreEnv,
  job: SubmissionJob,
  ctx: ProcessContext,
): Promise<{ response: JobSubmitResponse; failed: boolean; settled: boolean }> {
  const { request, submissionId, userId } = job;
  let result: PipelineResult = { method: 'none', jobs: [], usage: { inputTokens: 0, outputTokens: 0 } };
  let error: string | undefined;
  let jobs: SubmittedJob[] = [];
  try {
    result = ctx.precomputed ?? (await runSubmitPipeline(ctx.pipeline, request));
    jobs = await storeJobs(env, result.jobs, request.visibility, {
      userId,
      submissionId,
      pageUrl: request.url,
      sharedPageUrl: result.jobs.length > 1,
      index: ctx.index,
      now: ctx.now,
    });
  } catch (err) {
    if (ctx.throwOnError) throw err;
    error = err instanceof Error ? err.message : String(err);
    console.warn('[job-submit] pipeline failed', submissionId, err);
  }

  const created = countBy(jobs, 'new');
  const stored: StoredSubmissionResult = {
    id: submissionId,
    visibility: request.visibility,
    method: result.method,
    jobs,
    found: result.jobs.length,
    created,
    duplicates: countBy(jobs, 'duplicate'),
    charged: 0,
    rewarded: 0,
  };
  const note = error ? '处理中出错，已按规则结算' : result.note;
  if (note) stored.note = note;

  const costMicro = submitAiCostMicro(result.usage.inputTokens, result.usage.outputTokens);
  const settleInput = {
    submissionId,
    userId,
    visibility: request.visibility,
    method: result.method,
    found: result.jobs.length,
    created: request.visibility === 'public' ? created : 0,
    costMicro,
    holdMicro: job.holdMicro,
    error,
    now: ctx.now,
  };
  const settlement = await settleSubmissionBilling(env, { ...settleInput, result: stored });
  let final = stored;
  if (settlement) {
    stored.charged = microToDisplay(settlement.chargeMicro);
    stored.rewarded = microToDisplay(settlement.rewardMicro);
    await env.MUICV_API_DB.prepare('UPDATE jobSubmission SET result = ? WHERE id = ?')
      .bind(JSON.stringify(stored), submissionId)
      .run();
  } else {
    // 已结算过（队列重放）：以第一次的结果为准
    final = (await loadStoredResult(env, submissionId)) ?? stored;
  }
  const balance = (await readBalance(env, userId))?.balance ?? 0;
  return {
    response: { ...final, balance: microToDisplay(balance) },
    failed: Boolean(error) && result.jobs.length === 0,
    settled: settlement !== null,
  };
}

export async function loadStoredResult(env: StoreEnv, submissionId: string): Promise<StoredSubmissionResult | null> {
  const row = await env.MUICV_API_DB.prepare('SELECT result FROM jobSubmission WHERE id = ? LIMIT 1')
    .bind(submissionId)
    .first<{ result: string | null }>();
  if (!row?.result) return null;
  try {
    const parsed = JSON.parse(row.result) as StoredSubmissionResult;
    return Array.isArray(parsed.jobs) ? parsed : null;
  } catch {
    return null;
  }
}
