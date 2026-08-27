import assert from 'node:assert/strict';
import test from 'node:test';

import app from '../src/app.ts';

/**
 * /audio/tts 测试。
 *
 * 跟 transcribe.test.ts 同一套思路：Hono app.request() 打 in-memory 实例，
 * stub D1（apiKey / tokenBalance / tokenLedger），另外 stub 全局 fetch 拦截对
 * api.xiaomimimo.com 的上游调用。覆盖：
 *   - 入口校验（缺 key / 非 JSON / text 空·超长 / voice 形状）
 *   - 余额不足 / happy path（audio/wav + 按 chars 扣账）/ key 未配 500
 *   - 上游 HTTP 错误、缺 audio.data → 502 + 不扣账
 */

type Stmt = {
  bind: (..._args: unknown[]) => Stmt;
  run: () => Promise<unknown>;
  first: <T = unknown>() => Promise<T | null>;
};

/** 生一段最小 RIFF/WAV 假字节并转 base64，模拟上游 message.audio.data。 */
function fakeWavBase64(): string {
  return Buffer.from('RIFF0000WAVEfmt fake-pcm-data').toString('base64');
}

type UpstreamResponse =
  | { kind: 'ok'; audioBase64?: string }
  | { kind: 'http-error'; status: number; body?: string }
  | { kind: 'invalid-json'; body?: string }
  | { kind: 'network-error'; message?: string };

type MockOptions = {
  authenticated?: boolean;
  walletMicro?: number;
  /** 设为 false 时 env 里不给 MIMO_API_KEY */
  hasMimoKey?: boolean;
  upstream?: UpstreamResponse;
  ledgerCaptures?: Array<{ delta: number; type: string }>;
};

const FAKE_API_KEY = `mui_${'b'.repeat(32)}`;
const FAKE_USER_ID = 'u_tts';
const AUTH = { authorization: `Bearer ${FAKE_API_KEY}` };
const JSON_CT = { 'content-type': 'application/json' };
const ctx = { waitUntil: (p: Promise<unknown>) => p, passThroughOnException: () => {} } as unknown as ExecutionContext;

function mockEnv(opts: MockOptions = {}): Record<string, unknown> {
  let walletBalance = opts.walletMicro;

  const makeStmt = (sql: string): Stmt => {
    const captured: { args: unknown[] } = { args: [] };
    const stmt: Stmt = {
      bind: (...args) => {
        captured.args = args;
        return stmt;
      },
      run: async () => {
        if (opts.ledgerCaptures && /INSERT INTO tokenLedger/i.test(sql)) {
          const delta = captured.args[2] as number;
          const ledgerType = captured.args[3] as string;
          opts.ledgerCaptures.push({ delta, type: ledgerType });
        }
        return { success: true };
      },
      first: async <T = unknown>(): Promise<T | null> => {
        if (opts.authenticated && /FROM apiKey/i.test(sql)) {
          return { id: 'k_tts', userId: FAKE_USER_ID, revokedAt: null } as T;
        }
        if (/INSERT INTO tokenBalance/i.test(sql) && /ON CONFLICT/i.test(sql)) {
          return null; // 已有行 → readBalance 兜底
        }
        if (/UPDATE tokenBalance/i.test(sql) && /RETURNING balance/i.test(sql)) {
          if (walletBalance == null) return null;
          const amount = captured.args[0] as number;
          if (walletBalance < amount) return null;
          walletBalance -= amount;
          return { balance: walletBalance } as T;
        }
        if (/SELECT balance/i.test(sql) && /tokenBalance/i.test(sql)) {
          if (walletBalance == null) return null;
          return { balance: walletBalance, lifetimeEarned: walletBalance, lifetimeSpent: 0 } as T;
        }
        return null;
      },
    };
    return stmt;
  };

  return {
    MUICV_API_DB: { prepare: (sql: string) => makeStmt(sql) },
    BROWSER: { fetch: async () => new Response('') },
    MUICV_KV: { put: async () => {}, get: async () => null, delete: async () => {} },
    AI: { run: async () => ({}) },
    RENDER_BASE_URL: 'https://muicv.com',
    OPENAI_API_KEY: 'sk-fake',
    ...(opts.hasMimoKey === false ? {} : { MIMO_API_KEY: 'sk-mimo-fake' }),
  };
}

/** 替换全局 fetch 拦截上游调用，跑完 body 后恢复。 */
async function withUpstream<R>(
  upstream: UpstreamResponse | ((url: string, body: unknown) => UpstreamResponse),
  fn: () => Promise<R>,
): Promise<R> {
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (!url.includes('api.xiaomimimo.com')) {
        return await realFetch(input as RequestInfo, init);
      }
      const picked = typeof upstream === 'function' ? upstream(url, JSON.parse(String(init?.body ?? '{}'))) : upstream;
      switch (picked.kind) {
        case 'ok':
          return new Response(
            JSON.stringify({ choices: [{ message: { audio: { data: picked.audioBase64 ?? fakeWavBase64() } } }] }),
            { status: 200 },
          );
        case 'http-error':
          return new Response(picked.body ?? '{"error":{"message":"boom"}}', { status: picked.status });
        case 'invalid-json':
          return new Response(picked.body ?? '<html>not json</html>', { status: 200 });
        case 'network-error':
          throw new Error(picked.message ?? 'upstream unreachable');
      }
    }) as typeof fetch;

    return await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
}

async function post(
  body: string | object,
  opts: MockOptions = {},
  headers: Record<string, string> = { ...JSON_CT, ...AUTH },
) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return await app.request('/audio/tts', { method: 'POST', headers, body: raw }, mockEnv(opts), ctx);
}

const HAPPY_BODY = { text: '十个字的测试文本是这', voice: 'mimo_default' }; // 10 code points

test('POST /audio/tts 缺 Authorization → 401', async () => {
  const res = await app.request('/audio/tts', { method: 'POST' }, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('POST /audio/tts content-type 不是 json → 400', async () => {
  const res = await app.request(
    '/audio/tts',
    { method: 'POST', headers: AUTH, body: '{}' },
    mockEnv({ authenticated: true, walletMicro: 100_000_000 }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /json/i);
});

test('POST /audio/tts 请求体不是合法 JSON → 400', async () => {
  const res = await post('{oops', { authenticated: true, walletMicro: 100_000_000 }, AUTH);
  assert.equal(res.status, 400);
});

test('POST /audio/tts text 缺失 / 空白 → 400', async () => {
  for (const bad of [{}, { text: '   ' }]) {
    const res = await post(bad, { authenticated: true, walletMicro: 100_000_000 });
    assert.equal(res.status, 400);
  }
});

test('POST /audio/tts text 超过 2000 字符 → 400', async () => {
  const res = await post({ text: '字'.repeat(2001) }, { authenticated: true, walletMicro: 100_000_000 });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /2000/);
});

test('POST /audio/tts voice 形状非法 → 400', async () => {
  const res = await post({ ...HAPPY_BODY, voice: 'bad voice!!' }, { authenticated: true, walletMicro: 100_000_000 });
  assert.equal(res.status, 400);
});

test('POST /audio/tts 余额不足 → 402', async () => {
  const res = await post(HAPPY_BODY, { authenticated: true });
  assert.equal(res.status, 402);
  const json = (await res.json()) as { error: { code: string } };
  assert.equal(json.error.code, 'insufficient_balance');
});

test('POST /audio/tts MIMO_API_KEY 未配 → 500 tts-key-missing 且不扣账', async () => {
  const ledgerCaptures: Array<{ delta: number; type: string }> = [];
  const res = await post(HAPPY_BODY, {
    authenticated: true,
    hasMimoKey: false,
    walletMicro: 100_000_000,
    ledgerCaptures,
  });
  assert.equal(res.status, 500);
  const json = (await res.json()) as { error: string };
  assert.equal(json.error, 'tts-key-missing');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(
    ledgerCaptures.find((l) => l.type === 'tts'),
    undefined,
  );
});

test('POST /audio/tts happy path → 200 audio/wav + 正确请求形状 + 扣账', async () => {
  let upstreamBodyShape: unknown;
  const ledgerCaptures: Array<{ delta: number; type: string }> = [];

  const res = await withUpstream(
    (url, body) => {
      upstreamBodyShape = { url, body };
      return { kind: 'ok' };
    },
    async () =>
      // 余额给足：10 chars × 3 rate × 10000 = 300_000 μtoken 需要
      await post(
        { ...HAPPY_BODY, style: '亲切一点' },
        { authenticated: true, walletMicro: 100_000_000, ledgerCaptures },
      ),
  );

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /audio\/wav/);
  const bytes = new Uint8Array(await res.arrayBuffer());
  assert.deepEqual(Buffer.from(bytes).toString('base64'), fakeWavBase64());

  // 上游请求形状：assistant 放待合成文本、style 落 user 角色、audio 带 voice/format
  const shape = upstreamBodyShape as {
    url: string;
    body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      audio: { format: string; voice: string };
    };
  };
  assert.ok(shape.url.endsWith('/v1/chat/completions'));
  assert.equal(shape.body.model, 'mimo-v2.5-tts');
  assert.deepEqual(shape.body.messages, [
    { role: 'user', content: '亲切一点' },
    { role: 'assistant', content: HAPPY_BODY.text },
  ]);
  assert.equal(shape.body.audio.format, 'wav');
  assert.equal(shape.body.audio.voice, 'mimo_default');

  await new Promise((r) => setTimeout(r, 0));
  const ttsLedger = ledgerCaptures.find((l) => l.type === 'tts');
  assert.ok(ttsLedger, 'expected tts ledger entry');
  assert.equal(ttsLedger.delta, -300_000); // 10 chars × 3 显示token × 10000 μ
});

test('POST /audio/tts voice 缺省时上游收到 mimo_default', async () => {
  let seenVoice: unknown;
  const res = await withUpstream(
    (_url, body) => {
      seenVoice = (body as { audio?: { voice?: string } }).audio?.voice;
      return { kind: 'ok' };
    },
    async () => await post({ text: HAPPY_BODY.text }, { authenticated: true, walletMicro: 100_000_000 }),
  );

  assert.equal(res.status, 200);
  assert.equal(seenVoice, 'mimo_default');
});

test('POST /audio/tts 上游 HTTP 错误 → 502 + 不扣账', async () => {
  const ledgerCaptures: Array<{ delta: number; type: string }> = [];
  const res = await withUpstream(
    { kind: 'http-error', status: 500 },
    async () => await post(HAPPY_BODY, { authenticated: true, walletMicro: 100_000_000, ledgerCaptures }),
  );
  assert.equal(res.status, 502);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(
    ledgerCaptures.find((l) => l.type === 'tts'),
    undefined,
  );
});

test('POST /audio/tts 上游响应缺 audio.data → 502', async () => {
  const res = await withUpstream(
    { kind: 'invalid-json', body: '{"choices":[{"message":{}}]}' },
    async () => await post(HAPPY_BODY, { authenticated: true, walletMicro: 100_000_000 }),
  );
  assert.equal(res.status, 502);
});
