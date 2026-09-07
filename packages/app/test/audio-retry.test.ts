import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import { parseRetryAfter, postTranscribeWithRetry } from '../src/main/audio-retry.ts';
import type { AppConfig, AudioRecordingPayload } from '../src/shared/types.ts';

// 用最小的合法 wav payload，省得 fetch mock 真的去读音频。
const fakePayload: AudioRecordingPayload = {
  audioBase64: Buffer.from('FAKE').toString('base64'),
  mimeType: 'audio/wav',
  durationMs: 1000,
  pauses: [],
};

const fakeConfig: AppConfig = {
  profiles: [],
  activeProfileId: null,
  workspaceDir: null,
  muicvApiKey: 'mui_test',
  muicvApiBase: 'https://example.invalid',
  defaultModel: 'gpt-test',
  llmReasoningEffort: 'xhigh',
  customLlmBase: null,
  customLlmKey: null,
  onboardingCompleted: false,
};

let realFetch: typeof globalThis.fetch;
let calls: { status: number; url: string }[] = [];

beforeEach(() => {
  realFetch = globalThis.fetch;
  calls = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetchSequence(responses: Array<() => Response | Promise<Response>>): void {
  let i = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const idx = i;
    i = Math.min(i + 1, responses.length - 1);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const res = await responses[idx]();
    calls.push({ status: res.status, url });
    return res;
  }) as unknown as typeof globalThis.fetch;
}

function jsonRes(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

test('parseRetryAfter: 数值秒数', () => {
  assert.equal(parseRetryAfter('5'), 5000);
  assert.equal(parseRetryAfter('0'), 0);
});

test('parseRetryAfter: HTTP-date', () => {
  const future = new Date(Date.now() + 2000).toUTCString();
  const v = parseRetryAfter(future);
  assert.ok(v != null && v > 1000 && v < 3000);
});

test('parseRetryAfter: 过去的 HTTP-date 返回 0', () => {
  const past = new Date(Date.now() - 5000).toUTCString();
  assert.equal(parseRetryAfter(past), 0);
});

test('parseRetryAfter: null / 空 / 非法 → null', () => {
  assert.equal(parseRetryAfter(null), null);
  assert.equal(parseRetryAfter(''), null);
  assert.equal(parseRetryAfter('not-a-number-or-date'), null);
});

test('postTranscribeWithRetry: 200 一次过 → 调一次 fetch', async () => {
  mockFetchSequence([() => jsonRes(200, { transcript: '你好' })]);
  const body = await postTranscribeWithRetry(fakeConfig, fakePayload);
  assert.equal(body.transcript, '你好');
  assert.equal(calls.length, 1);
});

test('postTranscribeWithRetry: 503 + 503 + 200 → 3 次 fetch，最终成功', async () => {
  mockFetchSequence([
    () => new Response('upstream down', { status: 503 }),
    () => new Response('still down', { status: 503 }),
    () => jsonRes(200, { transcript: 'ok' }),
  ]);
  const body = await postTranscribeWithRetry(fakeConfig, fakePayload);
  assert.equal(body.transcript, 'ok');
  assert.equal(calls.length, 3);
});

test('postTranscribeWithRetry: 503 ×3 → 抛错，且确实试满 3 次', async () => {
  mockFetchSequence([() => new Response('down', { status: 503 })]);
  await assert.rejects(() => postTranscribeWithRetry(fakeConfig, fakePayload), /503|3 次/);
  assert.equal(calls.length, 3);
});

test('postTranscribeWithRetry: 401 立即抛，不重试', async () => {
  mockFetchSequence([() => new Response('unauthorized', { status: 401 })]);
  await assert.rejects(() => postTranscribeWithRetry(fakeConfig, fakePayload), /401/);
  assert.equal(calls.length, 1);
});

test('postTranscribeWithRetry: 400 立即抛，不重试', async () => {
  mockFetchSequence([() => new Response('bad request', { status: 400 })]);
  await assert.rejects(() => postTranscribeWithRetry(fakeConfig, fakePayload), /400/);
  assert.equal(calls.length, 1);
});

test('postTranscribeWithRetry: 429 + 200 → 重试，使用 Retry-After', async () => {
  mockFetchSequence([
    () => new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } }),
    () => jsonRes(200, { transcript: '通过' }),
  ]);
  const t0 = Date.now();
  const body = await postTranscribeWithRetry(fakeConfig, fakePayload);
  const elapsed = Date.now() - t0;
  assert.equal(body.transcript, '通过');
  assert.equal(calls.length, 2);
  // Retry-After: 0 → 即时重试，不等指数退避
  assert.ok(elapsed < 200, `expected <200ms, got ${elapsed}`);
});

test('postTranscribeWithRetry: fetch 抛错 → 视为可重试', async () => {
  mockFetchSequence([
    () => Promise.reject(new TypeError('fetch failed')),
    () => jsonRes(200, { transcript: 'recovered' }),
  ]);
  const body = await postTranscribeWithRetry(fakeConfig, fakePayload);
  assert.equal(body.transcript, 'recovered');
  assert.equal(calls.length, 1); // mock 只在成功 await 后 push；reject 不 push
});

test('postTranscribeWithRetry: 200 但响应缺 transcript → 视为错误，重试到 3 次', async () => {
  mockFetchSequence([() => jsonRes(200, { duration_ms: 1000 } /* 无 transcript */)]);
  await assert.rejects(() => postTranscribeWithRetry(fakeConfig, fakePayload), /transcript/);
  assert.equal(calls.length, 3);
});

test('postTranscribeWithRetry: maxAttempts=1 → 只试 1 次', async () => {
  mockFetchSequence([() => new Response('down', { status: 503 })]);
  await assert.rejects(() => postTranscribeWithRetry(fakeConfig, fakePayload, { maxAttempts: 1 }));
  assert.equal(calls.length, 1);
});
