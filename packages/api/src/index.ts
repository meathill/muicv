import app from './app.ts';
import { type CollectEnv, runScheduledCollect } from './cron/index.ts';

export default {
  fetch: app.fetch,
  async scheduled(_controller: unknown, env: CollectEnv, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(runScheduledCollect(env).catch((error: unknown) => console.error('[jobs-cron] 采集失败', error)));
  },
};
