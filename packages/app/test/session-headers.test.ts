import assert from 'node:assert/strict';
import test from 'node:test';

import { loggingFetch, setRunSessionId } from '../src/main/agent/reasoning-capture.ts';

test('loggingFetch: 注入当前 run 的 session header 与 User-Agent', async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    setRunSessionId('conv-session-42');
    await loggingFetch('https://api.muicv.com/llm/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-v4.1-flash', messages: [] }),
    });

    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get('x-opencode-session'), 'conv-session-42');
    assert.equal(headers.get('x-session-id'), 'conv-session-42');
    assert.equal(headers.get('user-agent'), 'muicv-app/1.0');
  } finally {
    setRunSessionId(null);
    globalThis.fetch = originalFetch;
  }
});

test('loggingFetch: 请求 opencode.ai 且无 session 时注入兜底 session', async () => {
  const originalFetch = globalThis.fetch;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    setRunSessionId(null);
    await loggingFetch('https://opencode.ai/zen/go/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-v4.1-flash', messages: [] }),
    });

    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get('x-opencode-session'), 'muicv-app-session');
    assert.equal(headers.get('user-agent'), 'muicv-app/1.0');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
