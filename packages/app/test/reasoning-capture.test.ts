import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isThinkingModeModel,
  loggingFetch,
  resetReasoningState,
  setReasoningDeltaListener,
  setRunSessionId,
} from '../src/main/agent/reasoning-capture.ts';

test('isThinkingModeModel: 识别 deepseek 和 mimo 系列模型', () => {
  assert.equal(isThinkingModeModel('deepseek-v4-flash'), true);
  assert.equal(isThinkingModeModel('deepseek-v4-flash-vision-exp'), true);
  assert.equal(isThinkingModeModel('mimo-v2.5'), true);
  assert.equal(isThinkingModeModel('gpt-5.6-luna'), false);
  assert.equal(isThinkingModeModel('gpt-5.6-sol'), false);
  assert.equal(isThinkingModeModel(null), false);
});

test('loggingFetch: 捕获 thinking-mode SSE 流的 reasoning_content 并注入到下一轮 assistant 消息', async () => {
  resetReasoningState();
  const originalFetch = globalThis.fetch;
  const requests: Array<{ body: string }> = [];

  const deltas: string[] = [];
  setReasoningDeltaListener((d) => deltas.push(d));

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ body: String(init?.body) });
    if (requests.length === 1) {
      // 模拟第一轮：模型进行了思考，并返回了 tool_calls（带 CRLF 换行边界）
      const sseChunks = [
        'data: {"choices":[{"delta":{"reasoning_content":"Thinking about tool..."}}]}\r\n\r\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"read_file","arguments":"{}"}}]}}]}\r\n\r\n',
        'data: [DONE]\r\n\r\n',
      ].join('');

      return new Response(sseChunks, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    }

    return new Response(JSON.stringify({ choices: [{ message: { content: 'Done' } }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    setRunSessionId('session-1');

    // Turn 1
    const res1 = await loggingFetch('https://api.muicv.com/llm/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: 'read file' }],
      }),
    });

    // 消费流
    const reader = res1.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }

    assert.deepEqual(deltas, ['Thinking about tool...']);

    // Turn 2: SDK 发送带 tool_calls 的 assistant 消息
    await loggingFetch('https://api.muicv.com/llm/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'user', content: 'read file' },
          {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{}' } }],
          },
          { role: 'tool', tool_call_id: 'call_1', content: 'file content' },
        ],
      }),
    });

    assert.equal(requests.length, 2);
    const turn2Body = JSON.parse(requests[1]!.body) as {
      messages: Array<{ role: string; reasoning_content?: string }>;
    };

    const assistantMsg = turn2Body.messages.find((m) => m.role === 'assistant');
    assert.ok(assistantMsg);
    assert.equal(assistantMsg?.reasoning_content, 'Thinking about tool...');
  } finally {
    resetReasoningState();
    setReasoningDeltaListener(null);
    setRunSessionId(null);
    globalThis.fetch = originalFetch;
  }
});

test('loggingFetch: 当 assistant 未捕获思考过程时，兜底注入空字符串避免 400', async () => {
  resetReasoningState();
  const originalFetch = globalThis.fetch;
  let capturedBody: string | undefined;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = String(init?.body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    // 直接发送未带 reasoning_content 的 assistant
    await loggingFetch('https://api.muicv.com/llm/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'user', content: 'hello' },
          { role: 'assistant', content: null, tool_calls: [{ id: '1' }] },
          { role: 'tool', tool_call_id: '1', content: 'res' },
        ],
      }),
    });

    const parsed = JSON.parse(capturedBody!) as {
      messages: Array<{ role: string; reasoning_content?: string }>;
    };
    const assistantMsg = parsed.messages.find((m) => m.role === 'assistant');
    assert.equal(assistantMsg?.reasoning_content, '');
  } finally {
    resetReasoningState();
    globalThis.fetch = originalFetch;
  }
});
