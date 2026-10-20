import app from './app.ts';
import { type CollectEnv, groupForCron, runScheduledCollect } from './cron/index.ts';
import { refundStaleHolds } from './lib/job-submit/billing.ts';
import type { SubmissionJob } from './lib/job-submit/process.ts';
import { consumeSubmitBatch, consumeSubmitDlq, JOB_SUBMIT_DLQ, type QueueBatch } from './lib/job-submit/queue.ts';
import type { WalletEnv } from './lib/wallet.ts';
import { type JobSubmitBindings, submitContext } from './routes/job-submit.ts';

export default {
  fetch: app.fetch,
  async scheduled(controller: { cron?: string }, env: CollectEnv, ctx: { waitUntil(p: Promise<unknown>): void }) {
    // 按触发器分组：6 小时一次的跑雇主 ATS，每天两次的跑垂直岗位板
    const group = groupForCron(controller.cron);
    ctx.waitUntil(
      runScheduledCollect(env, new Date(), group).catch((error: unknown) =>
        console.error('[jobs-cron] 采集失败', error),
      ),
    );
    // 顺手退回提交岗位时崩溃 / 队列卡住残留的预扣
    if (env.MUICV_API_DB) {
      ctx.waitUntil(
        refundStaleHolds(env as unknown as WalletEnv).catch((error: unknown) =>
          console.error('[job-submit] 退回残留预扣失败', error),
        ),
      );
    }
  },
  /** 岗位提交队列：主队列跑流水线，DLQ 全额退回预扣 */
  async queue(batch: QueueBatch<SubmissionJob>, env: JobSubmitBindings) {
    if (batch.queue === JOB_SUBMIT_DLQ) {
      await consumeSubmitDlq(env, batch);
      return;
    }
    await consumeSubmitBatch(env, batch, () => submitContext(env, Date.now()));
  },
};
