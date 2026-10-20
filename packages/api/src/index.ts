import app from './app.ts';
import { type CollectEnv, groupForCron, runScheduledCollect } from './cron/index.ts';

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
  },
};
