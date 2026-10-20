import {
  JOB_SUBMIT_POLL_BACKOFF,
  JOB_SUBMIT_POLL_TIMEOUT_MS,
  type JobSubmitResponse,
  type JobSubmitVisibility,
} from '@muicv/shared';

/**
 * 排队中的提交：id 存进 chrome.storage.local，关掉弹窗再打开也能接着轮询 / 看结果。
 * 只保留最近 10 条，超过 1 天的丢弃。
 */

export type PendingSubmission = {
  id: string;
  url: string;
  title: string;
  visibility: JobSubmitVisibility;
  createdAt: number;
};

const KEY = 'muicvPendingSubmissions';
const MAX = 10;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type KeyValueStore = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

async function read(store: KeyValueStore, now: number): Promise<PendingSubmission[]> {
  const list = (await store.get(KEY))[KEY];
  return Array.isArray(list) ? (list as PendingSubmission[]).filter((p) => now - p.createdAt < MAX_AGE_MS) : [];
}

export async function addPending(store: KeyValueStore, item: PendingSubmission): Promise<void> {
  const list = (await read(store, item.createdAt)).filter((p) => p.id !== item.id);
  await store.set({ [KEY]: [item, ...list].slice(0, MAX) });
}

export async function removePending(store: KeyValueStore, id: string, now = Date.now()): Promise<void> {
  await store.set({ [KEY]: (await read(store, now)).filter((p) => p.id !== id) });
}

export async function latestPending(store: KeyValueStore, now = Date.now()): Promise<PendingSubmission | null> {
  return (await read(store, now))[0] ?? null;
}

/** 第 n 次轮询前的等待（毫秒）：按退避表递增，最后一档重复。 */
export function pollDelay(attempt: number): number {
  return JOB_SUBMIT_POLL_BACKOFF[Math.min(attempt, JOB_SUBMIT_POLL_BACKOFF.length - 1)] ?? 5000;
}

export type PollOutcome = { kind: 'done'; result: JobSubmitResponse } | { kind: 'timeout' } | { kind: 'missing' };

/** 轮询直到结算 / 超时。fetchStatus 返回 null 表示提交不存在。 */
export async function pollSubmission(
  fetchStatus: () => Promise<{ status: string; result: JobSubmitResponse | null } | null>,
  options: { sleep?: (ms: number) => Promise<void>; now?: () => number; timeoutMs?: number; immediate?: boolean } = {},
): Promise<PollOutcome> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = options.now ?? Date.now;
  const started = now();
  const timeout = options.timeoutMs ?? JOB_SUBMIT_POLL_TIMEOUT_MS;
  for (let attempt = 0; ; attempt++) {
    // 重新打开弹窗时先立即查一次
    if (attempt > 0 || !options.immediate) await sleep(pollDelay(attempt));
    const status = await fetchStatus().catch(() => undefined);
    if (status === null) return { kind: 'missing' };
    if (status?.result) return { kind: 'done', result: status.result };
    if (now() - started >= timeout) return { kind: 'timeout' };
  }
}
