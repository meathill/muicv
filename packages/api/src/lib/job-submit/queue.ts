import { settleSubmissionBilling } from './billing.ts';
import { type ProcessContext, processSubmission, type SubmissionJob } from './process.ts';
import type { StoreEnv } from './store.ts';

/**
 * Cloudflare Queues 消费者：
 *   - muicv-job-submit：跑流水线并结算。异常 → retry（指数退避），超过 max_retries 进 DLQ
 *   - muicv-job-submit-dlq：按失败结算，全额退回预扣
 * 已结算的提交直接 ack（重复投递安全）。
 */

export const JOB_SUBMIT_QUEUE = 'muicv-job-submit';
export const JOB_SUBMIT_DLQ = 'muicv-job-submit-dlq';

export type QueueMessage<T> = {
  body: T;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};
export type QueueBatch<T> = { queue: string; messages: Array<QueueMessage<T>> };

async function isOpen(env: StoreEnv, id: string): Promise<boolean> {
  const row = await env.MUICV_API_DB.prepare('SELECT status FROM jobSubmission WHERE id = ? LIMIT 1')
    .bind(id)
    .first<{ status: string }>();
  return row?.status === 'queued' || row?.status === 'held';
}

export async function consumeSubmitBatch(
  env: StoreEnv,
  batch: QueueBatch<SubmissionJob>,
  makeContext: () => Omit<ProcessContext, 'throwOnError'>,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      if (!(await isOpen(env, msg.body.submissionId))) {
        msg.ack();
        continue;
      }
      await processSubmission(env, msg.body, { ...makeContext(), throwOnError: true });
      msg.ack();
    } catch (err) {
      console.warn('[job-submit] queue attempt failed', msg.body.submissionId, msg.attempts, err);
      msg.retry({ delaySeconds: Math.min(30 * 2 ** (msg.attempts - 1), 600) });
    }
  }
}

export async function consumeSubmitDlq(
  env: StoreEnv,
  batch: QueueBatch<SubmissionJob>,
  now = Date.now(),
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;
    try {
      await settleSubmissionBilling(env, {
        submissionId: job.submissionId,
        userId: job.userId,
        visibility: job.request.visibility,
        method: 'none',
        found: 0,
        created: 0,
        costMicro: 0,
        holdMicro: job.holdMicro,
        result: {
          id: job.submissionId,
          visibility: job.request.visibility,
          method: 'none',
          jobs: [],
          found: 0,
          created: 0,
          duplicates: 0,
          charged: 0,
          rewarded: 0,
          note: '处理多次失败，预扣已全额退回，请稍后重试',
        },
        error: 'dead_letter',
        now,
      });
      msg.ack();
    } catch (err) {
      console.error('[job-submit] dlq settle failed', job.submissionId, err);
      msg.retry({ delaySeconds: 60 });
    }
  }
}
