import test from 'node:test';
import assert from 'node:assert/strict';

import app from '../src/app.ts';

/**
 * 真正的 happy path（PDF 渲染、JD 抓取）需要 Docker + Container，留给 e2e。
 * 这里用 Hono 的 app.request() 直接打 in-memory 实例，覆盖：
 *
 * 1. 入口层请求校验（content-type / 字段 schema）—— 最容易回归
 * 2. /waitlist 走 mock D1 的成功 / 冲突路径
 * 3. /me 缺 key 直接 401
 *
 * D1 mock 只实现 prepare→bind→run/first 链路，足够 hit handler 的所有分支。
 */

type Stmt = {
  bind: (..._args: unknown[]) => Stmt;
  run: () => Promise<unknown>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
};

type MockOptions = {
  run?: () => Promise<unknown>;
  first?: <T = unknown>() => Promise<T | null>;
  /** true 时 SELECT FROM apiKey 强制返 fake 行，让带 FAKE_API_KEY 的请求通过 requireApiKey */
  authenticated?: boolean;
  /** > 0 时 INSERT/SELECT tokenBalance 返回该 μtoken 余额，让 LLM 走平台路径 */
  walletMicro?: number;
  /** OpenAI / Xiaomi key（默认两把都配好）。设 null 模拟「key 缺失」。 */
  openaiKey?: string | null;
  mimoKey?: string | null;
  /** /me 路径的 user 行；设 false 模拟 user-not-found；缺省时打 /me 路径会兜默认 fake 行 */
  user?: { id: string; email: string; name: string | null; image: string | null } | false;
  /** /me 路径的 subscription 行（null = 无订阅，缺省 = null） */
  subscription?: {
    status: string;
    stripePriceId: string | null;
    monthlyTokens: number | null;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: number;
  } | null;
  /** Stripe price IDs（覆盖默认）。设 null 模拟未配置（dev / 老部署）。 */
  stripePriceIds?: {
    pro_monthly?: string | null;
    pro_yearly?: string | null;
    max_monthly?: string | null;
    max_yearly?: string | null;
  };
};

const FAKE_API_KEY = `mui_${'a'.repeat(32)}`;
const FAKE_USER_ID = 'u_test';

function mockEnv(opts: MockOptions = {}): unknown {
  const makeStmt = (sql: string): Stmt => {
    const stmt: Stmt = {
      bind: () => stmt,
      run: opts.run ?? (async () => ({ success: true })),
      all: async <T = unknown>(): Promise<{ results: T[] }> => ({ results: [] }),
      first: async <T = unknown>(): Promise<T | null> => {
        if (opts.authenticated && /FROM apiKey/i.test(sql)) {
          return { id: 'k_test', userId: FAKE_USER_ID, revokedAt: null } as T;
        }
        if (opts.walletMicro != null && /tokenBalance/i.test(sql)) {
          // INSERT…RETURNING balance / SELECT balance,…—统一返带 μtoken 的行，
          // ensureBalance 取到非零余额，LLM 路由进入平台分支
          return {
            balance: opts.walletMicro,
            lifetimeEarned: opts.walletMicro,
            lifetimeSpent: 0,
          } as T;
        }
        if (/FROM user\b/i.test(sql)) {
          if (opts.user === false) return null;
          return (opts.user ?? { id: FAKE_USER_ID, email: 'u@test.com', name: 'tester', image: null }) as T;
        }
        if (/FROM muirouterLink/i.test(sql)) {
          return null;
        }
        if (/FROM subscription/i.test(sql)) {
          return (opts.subscription ?? null) as T | null;
        }
        // 其余表走调用方 first override 或默认 null
        return opts.first ? await opts.first<T>() : null;
      },
    };
    return stmt;
  };
  const r2Store = new Map<string, Uint8Array>();
  function makeR2Stub(store: Map<string, Uint8Array>) {
    return {
      put: async (key: string, body: ReadableStream | Blob | Uint8Array | ArrayBuffer) => {
        const u8 =
          body instanceof Uint8Array
            ? body
            : body instanceof ArrayBuffer
              ? new Uint8Array(body)
              : body instanceof Blob
                ? new Uint8Array(await body.arrayBuffer())
                : new Uint8Array(await new Response(body).arrayBuffer());
        store.set(key, u8);
        return { key, size: u8.length };
      },
      get: async (key: string) => {
        const u8 = store.get(key);
        if (!u8) return null;
        return {
          body: new Response(u8).body,
          size: u8.length,
          writeHttpMetadata: (_h: Headers) => {},
        };
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    };
  }
  const env: Record<string, unknown> = {
    MUICV_API_DB: {
      prepare: (sql: string) => makeStmt(sql),
      batch: async () => [{ success: true }],
    },
    // BROWSER / MUICV_KV 这些只需要满足 type shape；当前测试只覆盖入口校验
    // 路径，不会真的走 puppeteer 渲染 / KV 读写。
    BROWSER: { fetch: async () => new Response('') },
    MUICV_KV: {
      put: async () => {},
      get: async () => null,
      delete: async () => {},
    },
    // R2 mock：内存 Map，覆盖 put / get / delete 三件套；handler 不依赖 list / multipart upload
    MUICV_RESUME_BLOB: makeR2Stub(r2Store),
    // 证件照桶：和 RESUME_BLOB 用同一份 mock 实现，handler 不区分。
    MUICV_PHOTOS: makeR2Stub(r2Store),
    RENDER_BASE_URL: 'https://muicv.com',
    PHOTOS_PUBLIC_BASE_URL: 'https://i.muicv.com',
    PREVIEW_PUBLIC_BASE_URL: 'https://muicv.com',
  };
  if (opts.openaiKey !== null) env.OPENAI_API_KEY = opts.openaiKey ?? 'sk-fake-openai';
  if (opts.mimoKey !== null) env.MIMO_API_KEY = opts.mimoKey ?? 'sk-fake-mimo';
  // Stripe price IDs：默认全配，单测可覆盖。/me 用它把 stripePriceId 反查成 plan。
  const sp = opts.stripePriceIds ?? {};
  if (sp.pro_monthly !== null) env.STRIPE_PRICE_PRO_MONTHLY = sp.pro_monthly ?? 'price_pro_m';
  if (sp.pro_yearly !== null) env.STRIPE_PRICE_PRO_YEARLY = sp.pro_yearly ?? 'price_pro_y';
  if (sp.max_monthly !== null) env.STRIPE_PRICE_MAX_MONTHLY = sp.max_monthly ?? 'price_max_m';
  if (sp.max_yearly !== null) env.STRIPE_PRICE_MAX_YEARLY = sp.max_yearly ?? 'price_max_y';
  return env;
}

const AUTH = { authorization: `Bearer ${FAKE_API_KEY}` };
const authedEnv = (opts: Omit<MockOptions, 'authenticated'> = {}) => mockEnv({ ...opts, authenticated: true });

const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

test('GET / 返回 routes 清单', async () => {
  const res = await app.request('/', undefined, mockEnv(), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { name: string; routes: string[] };
  assert.equal(body.name, 'muicv-api');
  assert.ok(Array.isArray(body.routes) && body.routes.length > 0);
});

test('GET /health 返回 ok', async () => {
  const res = await app.request('/health', undefined, mockEnv(), ctx);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'ok');
});

test('GET /skills/catalog 从 Payload 返回 skill 来源索引，app 目录不暴露外站安装链接', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, cmsListResponse([cmsSkillDoc()]));
  try {
    const res = await app.request('/skills/catalog', undefined, mockEnv(), ctx);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      manifestVersion: number;
      skills: Array<{
        slug: string;
        title: string;
        summary: string;
        sourceUrl: string | null;
        distributionMode: string;
        appAvailability: string;
        installPackage?: unknown;
      }>;
    };
    assert.equal(body.manifestVersion, 1);
    const skill = body.skills.find((item) => item.slug === 'tencent-campus-recruiting');
    assert.ok(skill);
    assert.equal(skill.title, '腾讯校园招聘 Skill');
    assert.match(skill.summary, /岗位匹配/);
    assert.equal(skill.sourceUrl, null);
    assert.equal(skill.distributionMode, 'link_only');
    assert.equal(skill.appAvailability, 'link_only');
    assert.equal('installPackage' in skill, false);
  } finally {
    restore();
  }
});

test('GET /skills/:slug 详情不返回第三方安装包', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, cmsListResponse([cmsSkillDoc()]));
  try {
    const res = await app.request('/skills/tencent-campus-recruiting', undefined, mockEnv(), ctx);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { slug: string; distributionMode: string; installPackage: unknown };
    assert.equal(body.slug, 'tencent-campus-recruiting');
    assert.equal(body.distributionMode, 'link_only');
    assert.equal(body.installPackage, null);
  } finally {
    restore();
  }
});

test('GET /posts?section=jobs 返回求职文章', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, cmsListResponse([cmsPostDoc()]));
  try {
    const res = await app.request('/posts?section=jobs', undefined, mockEnv(), ctx);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { posts: Array<{ section: string; slug: string }> };
    assert.ok(
      body.posts.some(
        (post) => post.section === 'jobs' && post.slug === 'third-party-skills-tencent-campus-recruiting',
      ),
    );
  } finally {
    restore();
  }
});

test('POST /render content-type 不是 JSON → 400', async () => {
  const res = await app.request(
    '/render',
    { method: 'POST', headers: { 'content-type': 'text/plain', ...AUTH }, body: 'hi' },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /render markdown 缺失 → 400', async () => {
  const res = await app.request(
    '/render',
    { method: 'POST', headers: { 'content-type': 'application/json', ...AUTH }, body: '{}' },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /markdown/);
});

test('POST /render 缺 Authorization → 401', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ markdown: '# hi' }),
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 401);
});

test('POST /render 余额不足 → 402', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ markdown: '# hi' }),
    },
    // ensureBalance 的 INSERT…ON CONFLICT…DO NOTHING RETURNING 在 mock 里返 null
    // → 走 readBalance 兜底也返 null → 余额视作 0 < PDF_RENDER_COST → 402
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 402);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'insufficient_balance');
});

test('POST /jobs/fetch url 不是 http(s) → 400', async () => {
  const res = await app.request(
    '/jobs/fetch',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ url: 'ftp://example.com/jd' }),
    },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /jobs/fetch 缺 Authorization → 401', async () => {
  const res = await app.request(
    '/jobs/fetch',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/jd' }),
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 401);
});

test('POST /waitlist email 非法 → 400', async () => {
  const res = await app.request(
    '/waitlist',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /waitlist 合法 email → 201', async () => {
  const res = await app.request(
    '/waitlist',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'someone@example.com', source: 'test' }),
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true);
});

test('POST /waitlist UNIQUE 冲突 → 409', async () => {
  const res = await app.request(
    '/waitlist',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dup@example.com' }),
    },
    mockEnv({
      run: async () => {
        throw new Error('UNIQUE constraint failed: waitlist.email');
      },
    }),
    ctx,
  );
  assert.equal(res.status, 409);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'already-registered');
});

test('GET /me 缺 Authorization → 401', async () => {
  const res = await app.request('/me', undefined, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('POST /render 请求体不是合法 JSON → 400', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: '{not-json',
    },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /JSON/);
});

test('POST /render markdown 是空字符串 → 400', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ markdown: '   ' }),
    },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /jobs/fetch content-type 不是 JSON → 400', async () => {
  const res = await app.request(
    '/jobs/fetch',
    { method: 'POST', headers: { 'content-type': 'text/plain', ...AUTH }, body: 'hi' },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /jobs/fetch url 缺失 → 400', async () => {
  const res = await app.request(
    '/jobs/fetch',
    { method: 'POST', headers: { 'content-type': 'application/json', ...AUTH }, body: '{}' },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /jobs/fetch 请求体不是合法 JSON → 400', async () => {
  const res = await app.request(
    '/jobs/fetch',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: '{bad',
    },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /waitlist 请求体不是合法 JSON → 400', async () => {
  const res = await app.request(
    '/waitlist',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'oops',
    },
    mockEnv(),
    ctx,
  );
  // waitlist 路由当前对非法 JSON 走 email 缺失分支 → 400
  assert.equal(res.status, 400);
});

test('GET /me Authorization 不是 Bearer → 401', async () => {
  const res = await app.request('/me', { headers: { authorization: 'Basic abcd' } }, mockEnv(), ctx);
  assert.equal(res.status, 401);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /Bearer/);
});

test('GET /me Bearer 后是非法 key 格式 → 401', async () => {
  const res = await app.request('/me', { headers: { authorization: 'Bearer not-a-mui-key' } }, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('GET /me 无订阅 → plan=free', async () => {
  const res = await app.request('/me', { headers: AUTH }, authedEnv({ walletMicro: 1, subscription: null }), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { plan: string };
  assert.equal(body.plan, 'free');
});

test('GET /me 订阅 active + Pro 月付 priceId → plan=pro', async () => {
  const res = await app.request(
    '/me',
    { headers: AUTH },
    authedEnv({
      walletMicro: 1,
      subscription: {
        status: 'active',
        stripePriceId: 'price_pro_m',
        monthlyTokens: 500_000,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: 0,
      },
    }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { plan: string };
  assert.equal(body.plan, 'pro');
});

test('GET /me 订阅 trialing + Max 年付 priceId → plan=max', async () => {
  const res = await app.request(
    '/me',
    { headers: AUTH },
    authedEnv({
      walletMicro: 1,
      subscription: {
        status: 'trialing',
        stripePriceId: 'price_max_y',
        monthlyTokens: 48_000_000,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: 0,
      },
    }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { plan: string };
  assert.equal(body.plan, 'max');
});

test('GET /me 订阅 canceled（非活跃 status）→ plan=free', async () => {
  const res = await app.request(
    '/me',
    { headers: AUTH },
    authedEnv({
      walletMicro: 1,
      subscription: {
        status: 'canceled',
        stripePriceId: 'price_pro_m',
        monthlyTokens: 500_000,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: 0,
      },
    }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { plan: string };
  assert.equal(body.plan, 'free');
});

test('GET /me 合法格式但 DB 查不到 key → 401', async () => {
  const res = await app.request(
    '/me',
    { headers: { authorization: `Bearer mui_${'a'.repeat(32)}` } },
    mockEnv({ first: async () => null }),
    ctx,
  );
  assert.equal(res.status, 401);
});

test('GET /llm/v1/models 缺 key → 401', async () => {
  const res = await app.request('/llm/v1/models', undefined, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('CORS preflight from muicv.com 被允许', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'OPTIONS',
      headers: {
        origin: 'https://muicv.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    },
    mockEnv(),
    ctx,
  );
  // hono cors middleware: 命中白名单时回 access-control-allow-origin
  assert.equal(res.headers.get('access-control-allow-origin'), 'https://muicv.com');
});

test('CORS preflight from 未授信 origin 不返回 allow-origin', async () => {
  const res = await app.request(
    '/render',
    {
      method: 'OPTIONS',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'POST',
      },
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.headers.get('access-control-allow-origin'), null);
});

/**
 * LLM 代理：平台路径（余额 > 0）按 model 前缀分上游 + 校验支持列表。
 * 用 globalThis.fetch 拦截上游请求，断言 URL / Authorization / 不真的走网络。
 */
type FetchCapture = { url: string; init: RequestInit | undefined };
function withMockedFetch(captureInto: FetchCapture[], response: Response): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    captureInto.push({ url: String(url), init });
    return response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

function cmsListResponse(docs: unknown[]): Response {
  return Response.json({ docs });
}

function cmsSkillDoc() {
  return {
    slug: 'tencent-campus-recruiting',
    status: 'published',
    title: '腾讯校园招聘 Skill',
    publisher: '腾讯招聘',
    publisherType: 'official',
    sourceUrl: 'https://join.qq.com/post.html?query=p_2&activity=1251899672503271424',
    sourceLabel: '腾讯招聘官方岗位页',
    distributionMode: 'link_only',
    appAvailability: 'link_only',
    summary: '围绕腾讯校招做岗位匹配、简历修改和模拟面试。',
    bodyMarkdown: '## 这是什么\n\n由 Payload 管理的 skill。',
    useCases: [{ value: '腾讯校招岗位匹配' }],
    tags: [{ value: '腾讯招聘' }],
    keywords: [{ value: '腾讯校园招聘 Skill' }],
    publishedAt: '2026-05-16',
    seoTitle: '腾讯校园招聘 Skill',
    seoDescription: '腾讯校园招聘 Skill 的官方来源索引。',
  };
}

function cmsPostDoc() {
  return {
    slug: 'third-party-skills-tencent-campus-recruiting',
    section: 'jobs',
    status: 'published',
    title: '我们收录了腾讯校园招聘 Skill：先从官方来源索引开始',
    summary: '介绍 MuiCV 先把腾讯校园招聘 Skill 收录为第三方官方来源索引。',
    bodyMarkdown: '## 正文\n\n由 Payload 管理的文章。',
    tags: [{ value: '来源索引' }],
    keywords: [{ value: '腾讯校园招聘 Skill' }],
    author: 'Mui简历',
    publishedAt: '2026-05-16',
    seoTitle: '我们收录了腾讯校园招聘 Skill：官方来源索引与校招就业指导',
    seoDescription: '介绍 MuiCV 先把腾讯校园招聘 Skill 收录为第三方官方来源索引。',
  };
}

function makeChatCompletionResponse(model: string): Response {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl-test',
      object: 'chat.completion',
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

test('POST /llm/v1/chat/completions model=mimo-v2.5-pro → 上游 Xiaomi + MIMO key', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, makeChatCompletionResponse('mimo-v2.5-pro'));
  try {
    const res = await app.request(
      '/llm/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...AUTH },
        body: JSON.stringify({ model: 'mimo-v2.5-pro', messages: [{ role: 'user', content: 'hi' }] }),
      },
      mockEnv({ authenticated: true, walletMicro: 100_000_000, mimoKey: 'sk-mimo-test' }),
      ctx,
    );
    assert.equal(res.status, 200);
    assert.equal(captures.length, 1);
    assert.equal(captures[0]?.url, 'https://token-plan-cn.xiaomimimo.com/v1/chat/completions');
    const headers = new Headers(captures[0]?.init?.headers as HeadersInit);
    assert.equal(headers.get('authorization'), 'Bearer sk-mimo-test');
  } finally {
    restore();
  }
});

test('POST /llm/v1/chat/completions model=gpt-5.4 → 上游 OpenAI', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, makeChatCompletionResponse('gpt-5.4'));
  try {
    const res = await app.request(
      '/llm/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...AUTH },
        body: JSON.stringify({ model: 'gpt-5.4', messages: [{ role: 'user', content: 'hi' }] }),
      },
      mockEnv({ authenticated: true, walletMicro: 100_000_000, openaiKey: 'sk-openai-test' }),
      ctx,
    );
    assert.equal(res.status, 200);
    assert.equal(captures[0]?.url, 'https://api.openai.com/v1/chat/completions');
    const headers = new Headers(captures[0]?.init?.headers as HeadersInit);
    assert.equal(headers.get('authorization'), 'Bearer sk-openai-test');
  } finally {
    restore();
  }
});

test('POST /llm/v1/chat/completions model=gpt-4o-mini（表外）→ 400 unsupported_model', async () => {
  const res = await app.request(
    '/llm/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000 }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string; supported: string[] };
  assert.equal(body.error, 'unsupported_model');
  assert.ok(body.supported.includes('gpt-5.4'));
  assert.ok(body.supported.includes('mimo-v2.5'));
});

test('POST /llm/v1/chat/completions model=mimo-v2.5 但缺 MIMO_API_KEY → 500 mimo-key-missing', async () => {
  const res = await app.request(
    '/llm/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'mimo-v2.5', messages: [{ role: 'user', content: 'hi' }] }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000, mimoKey: null }),
    ctx,
  );
  assert.equal(res.status, 500);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'mimo-key-missing');
});

test('POST /llm/v1/chat/completions model=gpt-5.4 但缺 OPENAI_API_KEY → 500 openai-key-missing', async () => {
  const res = await app.request(
    '/llm/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'gpt-5.4', messages: [{ role: 'user', content: 'hi' }] }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000, openaiKey: null }),
    ctx,
  );
  assert.equal(res.status, 500);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'openai-key-missing');
});

test('POST /llm/v1/chat/completions 余额=0 + 没绑 muirouter → 402 insufficient_balance', async () => {
  const res = await app.request(
    '/llm/v1/chat/completions',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'gpt-5.4', messages: [{ role: 'user', content: 'hi' }] }),
    },
    // walletMicro 不设 → 余额 = 0；muirouterLink 表 SELECT 也返 null → 402
    mockEnv({ authenticated: true }),
    ctx,
  );
  assert.equal(res.status, 402);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'insufficient_balance');
});

// === /llm/v1/responses（OpenAI reasoning 模型必经端点）===

function makeResponsesJsonResponse(model: string): Response {
  return new Response(
    JSON.stringify({
      id: 'resp_test',
      object: 'response',
      model,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'hi' }] }],
      usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 3 } },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

test('POST /llm/v1/responses model=gpt-5.4 → 上游 OpenAI /v1/responses', async () => {
  const captures: FetchCapture[] = [];
  const restore = withMockedFetch(captures, makeResponsesJsonResponse('gpt-5.4'));
  try {
    const res = await app.request(
      '/llm/v1/responses',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...AUTH },
        body: JSON.stringify({ model: 'gpt-5.4', input: 'hi' }),
      },
      mockEnv({ authenticated: true, walletMicro: 100_000_000, openaiKey: 'sk-openai-test' }),
      ctx,
    );
    assert.equal(res.status, 200);
    assert.equal(captures[0]?.url, 'https://api.openai.com/v1/responses');
    const headers = new Headers(captures[0]?.init?.headers as HeadersInit);
    assert.equal(headers.get('authorization'), 'Bearer sk-openai-test');
  } finally {
    restore();
  }
});

test('POST /llm/v1/responses model=mimo-v2.5-pro → 400 unsupported_endpoint（mimo 没 responses）', async () => {
  const res = await app.request(
    '/llm/v1/responses',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'mimo-v2.5-pro', input: 'hi' }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000, mimoKey: 'sk-mimo-test' }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'unsupported_endpoint');
});

test('POST /llm/v1/responses 缺 model → 400 unsupported_model', async () => {
  const res = await app.request(
    '/llm/v1/responses',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ input: 'hi' }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000 }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'unsupported_model');
});

test('POST /llm/v1/responses model=gpt-4o-mini（表外）→ 400 unsupported_model', async () => {
  const res = await app.request(
    '/llm/v1/responses',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ model: 'gpt-4o-mini', input: 'hi' }),
    },
    mockEnv({ authenticated: true, walletMicro: 100_000_000 }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'unsupported_model');
});

// === /resume/sync/blob 加密路径 ===

test('POST /resume/sync/blob 缺 Authorization → 401', async () => {
  const res = await app.request(
    '/resume/sync/blob',
    {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      body: '',
    },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 401);
});

test('POST /resume/sync/blob content-type 不是 multipart → 400', async () => {
  const res = await app.request(
    '/resume/sync/blob',
    { method: 'POST', headers: { 'content-type': 'application/json', ...AUTH }, body: '{}' },
    authedEnv(),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /resume/sync/blob blob 字段缺失 → 400', async () => {
  const fd = new FormData();
  fd.append('summary', 'hi');
  const res = await app.request('/resume/sync/blob', { method: 'POST', headers: AUTH, body: fd }, authedEnv(), ctx);
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /blob/);
});

test('POST /resume/sync/blob summary 太长 → 400', async () => {
  const fd = new FormData();
  fd.append('blob', new Blob([new Uint8Array(8)], { type: 'application/zip' }), 'a.zip');
  fd.append('summary', 'x'.repeat(501));
  const res = await app.request('/resume/sync/blob', { method: 'POST', headers: AUTH, body: fd }, authedEnv(), ctx);
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /summary/);
});

test('POST /resume/sync/blob summary 含控制字符 → 400', async () => {
  const fd = new FormData();
  fd.append('blob', new Blob([new Uint8Array(8)], { type: 'application/zip' }), 'a.zip');
  fd.append('summary', 'before\nafter');
  const res = await app.request('/resume/sync/blob', { method: 'POST', headers: AUTH, body: fd }, authedEnv(), ctx);
  assert.equal(res.status, 400);
});

test('POST /resume/sync/blob 正常路径 → 200 + 返回 blobId / sizeBytes / summary / updatedAt', async () => {
  const fd = new FormData();
  fd.append('blob', new Blob([new Uint8Array(64)], { type: 'application/zip' }), 'a.zip');
  fd.append('summary', '快照 2026-05-10 · 3 文件 · 1 KB');
  const res = await app.request('/resume/sync/blob', { method: 'POST', headers: AUTH, body: fd }, authedEnv(), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { blobId: string; sizeBytes: number; summary: string; updatedAt: number };
  assert.match(body.blobId, /^[a-f0-9-]{36}$/i);
  assert.equal(body.sizeBytes, 64);
  assert.equal(body.summary, '快照 2026-05-10 · 3 文件 · 1 KB');
  assert.ok(body.updatedAt > 0);
});

test('GET /resume/snapshot/blob 没快照 → 404', async () => {
  const res = await app.request('/resume/snapshot/blob', { headers: AUTH }, authedEnv(), ctx);
  assert.equal(res.status, 404);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'no-snapshot');
});

test('GET /resume/snapshot/blob/:id/download invalid id → 400', async () => {
  const res = await app.request('/resume/snapshot/blob/!!/download', { headers: AUTH }, authedEnv(), ctx);
  assert.equal(res.status, 400);
});

test('GET /resume/sync/blob/history 空 → { items: [] }', async () => {
  const res = await app.request('/resume/sync/blob/history', { headers: AUTH }, authedEnv(), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { items: unknown[] };
  assert.deepEqual(body.items, []);
});

test('DELETE /resume/snapshot/blob → 200', async () => {
  const res = await app.request('/resume/snapshot/blob', { method: 'DELETE', headers: AUTH }, authedEnv(), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true);
});
