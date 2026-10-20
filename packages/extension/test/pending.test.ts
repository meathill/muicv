import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addPending, latestPending, pollDelay, pollSubmission, removePending } from '../src/popup/pending.ts';

function memoryStore() {
  const data: Record<string, unknown> = {};
  return {
    async get(key: string) {
      return { [key]: data[key] };
    },
    async set(items: Record<string, unknown>) {
      Object.assign(data, items);
    },
  };
}

const RESULT = {
  id: 's',
  visibility: 'public' as const,
  method: 'ai' as const,
  jobs: [],
  found: 0,
  created: 0,
  duplicates: 0,
  charged: 0,
  rewarded: 0,
  balance: 1,
};

describe('排队中的提交', () => {
  it('存取最近的提交，过期丢弃', async () => {
    const store = memoryStore();
    await addPending(store, { id: 'a', url: 'u', title: 't', visibility: 'public', createdAt: 1000 });
    await addPending(store, { id: 'b', url: 'u', title: 't', visibility: 'private', createdAt: 2000 });
    assert.equal((await latestPending(store, 3000))?.id, 'b');
    await removePending(store, 'b', 3000);
    assert.equal((await latestPending(store, 3000))?.id, 'a');
    assert.equal(await latestPending(store, 1000 + 25 * 3600 * 1000), null);
  });

  it('退避递增并封顶', () => {
    assert.ok(pollDelay(0) < pollDelay(2));
    assert.equal(pollDelay(99), pollDelay(4));
  });

  it('轮询到结果为止；重新打开时先立即查一次', async () => {
    const waits: number[] = [];
    let calls = 0;
    const out = await pollSubmission(
      async () => (++calls >= 3 ? { status: 'settled', result: RESULT } : { status: 'queued', result: null }),
      { sleep: async (ms) => void waits.push(ms), immediate: true },
    );
    assert.equal(out.kind, 'done');
    assert.equal(waits.length, 2);
  });

  it('超时 / 不存在', async () => {
    let clock = 0;
    const timeout = await pollSubmission(async () => ({ status: 'queued', result: null }), {
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
      timeoutMs: 10_000,
    });
    assert.equal(timeout.kind, 'timeout');
    assert.equal((await pollSubmission(async () => null, { sleep: async () => {} })).kind, 'missing');
  });
});
