import {
  estimateSubmitHoldMicro,
  insufficientBalanceError,
  type JobSubmitAccepted,
  type JobSubmitStatus,
  type JobSubmitStatusValue,
  microToDisplay,
} from '@muicv/shared';
import type { Context } from 'hono';

import { holdForSubmission, markQueued } from '../lib/job-submit/billing.ts';
import { cachedLinkFetcher } from '../lib/job-submit/link-cache.ts';
import { type PipelineDeps, runDeterministic } from '../lib/job-submit/pipeline.ts';
import {
  loadStoredResult,
  type ProcessContext,
  processSubmission,
  type SubmissionJob,
} from '../lib/job-submit/process.ts';
import { parseSubmitRequest } from '../lib/job-submit/request.ts';
import type { TextAi } from '../lib/job-submit/types.ts';
import { readJsonBody } from '../lib/json-body.ts';
import { ensureBalance, readBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';
import { indexCommunityJdById, type JobSearchBindings } from './job-search.ts';

/**
 * POST /jobs/submit —— 扩展提交任意页面，服务端识别岗位并入库（公共池 / 私藏）。
 *   - 预扣后先跑免费的确定性识别（JSON-LD / 已知 ATS），命中就同步处理，200 + 结果
 *   - 否则（需要 AI / 外链抓取）入队 muicv-job-submit，202 + { id, status: 'queued' }；
 *     没有队列绑定（本地 / 测试）时退化为同步处理
 * GET /jobs/submit/:id —— 查询本人提交的状态与结果。
 * GET /jobs/saved —— 本人私藏岗位列表。
 * 鉴权 requireApiKey；按 userId 限流（JOBS_SUBMIT_LIMITER）。计费规则见 shared/jobs/submit.ts。
 */

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };
type Producer = { send(body: SubmissionJob): Promise<unknown> };

export type JobSubmitBindings = JobSearchBindings & { JOBS_SUBMIT_LIMITER?: RateLimiter; JOB_SUBMIT_QUEUE?: Producer };

export type JobSubmitOverrides = { pipeline?: PipelineDeps; now?: () => number; id?: () => string };

function bindings(c: Context<AppEnv>): JobSubmitBindings {
  return c.env as unknown as JobSubmitBindings;
}

/** 生产环境的处理上下文（队列消费者也用它）。 */
export function submitContext(
  env: JobSubmitBindings,
  now: number,
  pipeline?: PipelineDeps,
): Omit<ProcessContext, 'throwOnError'> {
  return {
    pipeline: pipeline ?? {
      ai: (env.AI as unknown as TextAi | undefined) ?? null,
      fetchLink: cachedLinkFetcher(env.MUICV_API_DB, fetch, now),
    },
    index: (id) => indexCommunityJdById(env, id),
    now,
  };
}

export function createJobsSubmitHandler(overrides: JobSubmitOverrides = {}) {
  return async function handleJobsSubmit(c: Context<AppEnv>): Promise<Response> {
    const env = bindings(c);
    const userId = c.get('userId') as string;
    if (env.JOBS_SUBMIT_LIMITER) {
      const { success } = await env.JOBS_SUBMIT_LIMITER.limit({ key: userId });
      if (!success) return c.json({ error: '提交太频繁，请稍后再试' }, 429);
    }
    const parsed = await readJsonBody<Record<string, unknown>>(c);
    if (!parsed.ok) return parsed.response;
    const req = parseSubmitRequest(parsed.body);
    if (!req.ok) return c.json({ error: req.error }, 400);
    const request = req.value;

    const now = overrides.now?.() ?? Date.now();
    const submissionId = overrides.id?.() ?? crypto.randomUUID();
    const holdMicro = estimateSubmitHoldMicro(request.markdown.length);
    const wallet = await ensureBalance(env, userId);
    if (wallet.balance < holdMicro) return c.json(insufficientBalanceError(wallet.balance), 402);
    const held = await holdForSubmission(env, {
      submissionId,
      userId,
      url: request.url,
      visibility: request.visibility,
      holdMicro,
      now,
    });
    if (!held.ok) return c.json(insufficientBalanceError(held.balance), 402);

    const job: SubmissionJob = { submissionId, userId, request, holdMicro };
    const ctx = submitContext(env, now, overrides.pipeline);
    const precomputed = await runDeterministic(ctx.pipeline, request).catch(() => null);

    if (!precomputed && env.JOB_SUBMIT_QUEUE) {
      try {
        await env.JOB_SUBMIT_QUEUE.send(job);
        await markQueued(env, submissionId);
        const accepted: JobSubmitAccepted = { id: submissionId, status: 'queued' };
        return c.json(accepted, 202);
      } catch (err) {
        console.warn('[job-submit] enqueue failed, processing inline', submissionId, err);
      }
    }

    const { response, failed } = await processSubmission(env, job, { ...ctx, precomputed });
    return c.json(response, failed ? 502 : 200);
  };
}

export const handleJobsSubmit = createJobsSubmitHandler();

export async function handleJobsSubmitStatus(c: Context<AppEnv>): Promise<Response> {
  const env = bindings(c);
  const userId = c.get('userId') as string;
  const id = c.req.param('id') ?? '';
  const row = await env.MUICV_API_DB.prepare('SELECT status FROM jobSubmission WHERE id = ? AND userId = ? LIMIT 1')
    .bind(id, userId)
    .first<{ status: JobSubmitStatusValue }>();
  if (!row) return c.json({ error: 'not-found' }, 404);
  const done = row.status === 'settled' || row.status === 'failed';
  const stored = done ? await loadStoredResult(env, id) : null;
  const balance = stored ? ((await readBalance(env, userId))?.balance ?? 0) : 0;
  const body: JobSubmitStatus = {
    id,
    status: row.status,
    result: stored ? { ...stored, balance: microToDisplay(balance) } : null,
  };
  c.header('cache-control', 'no-store');
  return c.json(body);
}

export async function handleSavedJobs(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId') as string;
  const { results } = await bindings(c)
    .MUICV_API_DB.prepare(
      `SELECT id, url, title, company, location, workplace, restrictions, createdAt, updatedAt
       FROM savedJob WHERE userId = ? ORDER BY updatedAt DESC LIMIT 100`,
    )
    .bind(userId)
    .all<{ restrictions: string } & Record<string, unknown>>();
  const items = (results ?? []).map((r) => ({ ...r, restrictions: JSON.parse(r.restrictions || '{}') as unknown }));
  return c.json({ items });
}
