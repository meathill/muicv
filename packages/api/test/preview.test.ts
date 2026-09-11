import assert from 'node:assert/strict';
import test from 'node:test';

import type { TemplateResumeData } from '@muicv/shared';

import app from '../src/app.ts';

/**
 * /preview/* 路由覆盖：
 *   - 入口校验（content-type / schema / 模板名 / 缺 token）
 *   - GET 公开端点（404 / 410 / 200）
 *   - 撤销 / 续期需要 owner 校验
 *
 * PDF 渲染那条路径需要真 puppeteer + workers BROWSER binding，留给 e2e；
 * 这里 mockEnv 把 BROWSER.launch 拦在 puppeteer 入口外，单测只验入口校验和 D1 状态。
 */

const FAKE_API_KEY = `mui_${'a'.repeat(32)}`;
const FAKE_USER_ID = 'u_test';
const AUTH = { authorization: `Bearer ${FAKE_API_KEY}` };
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

function sampleResume(): TemplateResumeData {
  return {
    schemaVersion: 1,
    name: { zh: '李 凌', en: 'Ling Wei' },
    title: { zh: '工程师', en: 'Engineer' },
    contact: { location: { zh: '上海', en: 'Shanghai' }, email: 'a@b.com' },
    summary: { zh: '一段话', en: 'One paragraph.' },
    experience: [
      {
        org: { zh: '字节', en: 'ByteDance' },
        role: { zh: '实习', en: 'Intern' },
        period: '2025',
        bullets: { zh: ['x'], en: ['x'] },
      },
    ],
    education: [{ school: { zh: '清华', en: 'Tsinghua' }, degree: { zh: '硕士', en: 'MS' }, period: '2023-2026' }],
    projects: [{ name: { zh: '项目', en: 'Project' }, desc: { zh: '描述', en: 'desc' } }],
    skills: { code: ['TS'] },
  };
}

type PreviewRow = {
  token: string;
  userId: string;
  resumeJson: string;
  template: string;
  lang: string;
  accent: string | null;
  shareMode: string;
  pdfCredit: number;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

type MockOpts = {
  authenticated?: boolean;
  /** 命中 `FROM preview` 的 SELECT 时返回的行；缺省返 null（即 404 路径）。 */
  previewRow?: PreviewRow | null;
  /** 命中 GET /preview 列表的 .all() 时返回的行；缺省空数组。 */
  previewList?: PreviewRow[];
};

function mockEnv(opts: MockOpts = {}): unknown {
  type Stmt = {
    bind: (..._a: unknown[]) => Stmt;
    run: () => Promise<unknown>;
    first: <T>() => Promise<T | null>;
    all: <T>() => Promise<{ results: T[] }>;
  };
  const stmtFor = (sql: string): Stmt => {
    const stmt: Stmt = {
      bind: () => stmt,
      run: async () => ({ success: true, meta: { changes: 1 } }),
      first: async <T>(): Promise<T | null> => {
        if (opts.authenticated && /FROM apiKey/i.test(sql)) {
          return { id: 'k', userId: FAKE_USER_ID, revokedAt: null } as T;
        }
        if (/FROM preview/i.test(sql)) {
          return (opts.previewRow ?? null) as T | null;
        }
        return null;
      },
      all: async <T>(): Promise<{ results: T[] }> => {
        if (/FROM preview/i.test(sql)) {
          return { results: (opts.previewList ?? []) as T[] };
        }
        return { results: [] };
      },
    };
    return stmt;
  };
  return {
    MUICV_API_DB: { prepare: stmtFor, batch: async () => [{ success: true }] },
    BROWSER: { fetch: async () => new Response('') },
    MUICV_KV: { put: async () => {}, get: async () => null, delete: async () => {} },
    MUICV_RESUME_BLOB: { put: async () => ({}), get: async () => null, delete: async () => {} },
    MUICV_PHOTOS: { put: async () => ({}), get: async () => null, delete: async () => {} },
    RENDER_BASE_URL: 'https://muicv.com',
    PREVIEW_PUBLIC_BASE_URL: 'https://muicv.com',
    PHOTOS_PUBLIC_BASE_URL: 'https://i.muicv.com',
  };
}

function makePreviewRow(overrides: Partial<PreviewRow> = {}): PreviewRow {
  return {
    token: 'a'.repeat(8) + '-aaaa-aaaa-aaaa-' + 'a'.repeat(12),
    userId: FAKE_USER_ID,
    resumeJson: JSON.stringify(sampleResume()),
    template: 't3-sidebar',
    lang: 'zh',
    accent: null,
    shareMode: 'link',
    pdfCredit: 0,
    createdAt: Date.now() - 1000,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    revokedAt: null,
    ...overrides,
  };
}

test('POST /preview 缺 Authorization → 401', async () => {
  const res = await app.request(
    '/preview',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
    mockEnv(),
    ctx,
  );
  assert.equal(res.status, 401);
});

test('POST /preview content-type 不对 → 400', async () => {
  const res = await app.request(
    '/preview',
    { method: 'POST', headers: { 'content-type': 'text/plain', ...AUTH }, body: '{}' },
    mockEnv({ authenticated: true }),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /preview template 非法 → 400', async () => {
  const res = await app.request(
    '/preview',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ resumeJson: sampleResume(), template: 'tx-fake' }),
    },
    mockEnv({ authenticated: true }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /template/);
});

test('POST /preview resumeJson 不符合 schema → 400', async () => {
  const res = await app.request(
    '/preview',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ resumeJson: { foo: 'bar' }, template: 't1-classic' }),
    },
    mockEnv({ authenticated: true }),
    ctx,
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /TemplateResumeData/);
});

test('POST /preview 正常 → 201 + 返回 url / token / expiresAt', async () => {
  const res = await app.request(
    '/preview',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({
        resumeJson: sampleResume(),
        template: 't2-minimal',
        lang: 'en',
        shareMode: 'link',
        ttlDays: 7,
      }),
    },
    mockEnv({ authenticated: true }),
    ctx,
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as { token: string; url: string; expiresAt: number; template: string; lang: string };
  assert.match(body.token, /^[0-9a-f-]{36}$/i);
  assert.equal(body.url, `https://muicv.com/preview/${body.token}`);
  assert.equal(body.template, 't2-minimal');
  assert.equal(body.lang, 'en');
  assert.ok(body.expiresAt > Date.now());
});

test('GET /preview/:token 不存在 → 404', async () => {
  const res = await app.request(
    '/preview/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    undefined,
    mockEnv({ previewRow: null }),
    ctx,
  );
  assert.equal(res.status, 404);
});

test('GET /preview/:token revoked → 410', async () => {
  const row = makePreviewRow({ revokedAt: Date.now() });
  const res = await app.request(`/preview/${row.token}`, undefined, mockEnv({ previewRow: row }), ctx);
  assert.equal(res.status, 410);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'revoked');
});

test('GET /preview/:token expired → 410', async () => {
  const row = makePreviewRow({ expiresAt: Date.now() - 1000 });
  const res = await app.request(`/preview/${row.token}`, undefined, mockEnv({ previewRow: row }), ctx);
  assert.equal(res.status, 410);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, 'expired');
});

test('GET /preview/:token 正常 → 200 + 公开字段', async () => {
  const row = makePreviewRow();
  const res = await app.request(`/preview/${row.token}`, undefined, mockEnv({ previewRow: row }), ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    token: string;
    template: string;
    lang: string;
    accent: string | null;
    resume: TemplateResumeData;
    shareMode: string;
    expiresAt: number;
    canDownloadPdf: boolean;
    userId?: string;
    pdfCredit?: number;
  };
  assert.equal(body.token, row.token);
  assert.equal(body.template, 't3-sidebar');
  assert.equal(body.lang, 'zh');
  assert.equal(body.shareMode, 'link');
  assert.equal(body.canDownloadPdf, false);
  // 公开端点不应泄漏 userId / pdfCredit
  assert.equal((body as Record<string, unknown>).userId, undefined);
  assert.equal((body as Record<string, unknown>).pdfCredit, undefined);
});

test('POST /preview/:token/pdf 不存在 → 404', async () => {
  const res = await app.request(
    '/preview/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/pdf',
    { method: 'POST' },
    mockEnv({ previewRow: null }),
    ctx,
  );
  assert.equal(res.status, 404);
});

test('POST /preview/:token/pdf owner 余额不足 → 402 insufficient_balance', async () => {
  // 0ca57da 起改了设计：任何拿到 token 的人都能点下载，统一按 owner 余额 gate。
  // pdfCredit 字段保留只是为了在公开 GET 端点暴露 canDownloadPdf 信号 + 渲染后累加，
  // 不再做 PDF POST 的拦截判定。这条用例验证 owner 钱包为 0 时返 insufficient_balance。
  const row = makePreviewRow({ pdfCredit: 0 });
  const res = await app.request(`/preview/${row.token}/pdf`, { method: 'POST' }, mockEnv({ previewRow: row }), ctx);
  assert.equal(res.status, 402);
  const body = (await res.json()) as { error: { code: string } };
  assert.equal(body.error.code, 'insufficient_balance');
});

test('POST /preview/:token/revoke 缺 Authorization → 401', async () => {
  const row = makePreviewRow();
  const res = await app.request(`/preview/${row.token}/revoke`, { method: 'POST' }, mockEnv({ previewRow: row }), ctx);
  assert.equal(res.status, 401);
});

test('GET /preview 缺 Authorization → 401', async () => {
  const res = await app.request('/preview', undefined, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('GET /preview 正常 → 200 + items 带 url / status', async () => {
  const now = Date.now();
  const list: PreviewRow[] = [
    {
      ...makePreviewRow(),
      token: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      createdAt: now,
      expiresAt: now + 1000,
    },
    {
      ...makePreviewRow(),
      token: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      createdAt: now - 1000,
      expiresAt: now - 500,
    },
    {
      ...makePreviewRow(),
      token: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      createdAt: now - 2000,
      expiresAt: now + 1000,
      revokedAt: now - 100,
    },
  ];
  const res = await app.request(
    '/preview',
    { headers: AUTH },
    mockEnv({ authenticated: true, previewList: list }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { items: Array<{ token: string; status: string; url: string }> };
  assert.equal(body.items.length, 3);
  assert.equal(body.items[0]?.status, 'active');
  assert.equal(body.items[1]?.status, 'expired');
  assert.equal(body.items[2]?.status, 'revoked');
  assert.ok(body.items[0]?.url.endsWith(`/preview/${body.items[0]?.token}`));
});

test('POST /preview/:token/share-mode 非法值 → 400', async () => {
  const row = makePreviewRow();
  const res = await app.request(
    `/preview/${row.token}/share-mode`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ shareMode: 'invalid' }),
    },
    mockEnv({ authenticated: true, previewRow: row }),
    ctx,
  );
  assert.equal(res.status, 400);
});

test('POST /preview/:token/share-mode public → 200', async () => {
  const row = makePreviewRow();
  const res = await app.request(
    `/preview/${row.token}/share-mode`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ shareMode: 'public' }),
    },
    mockEnv({ authenticated: true, previewRow: row }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; shareMode: string };
  assert.equal(body.ok, true);
  assert.equal(body.shareMode, 'public');
});

test('POST /preview/:token/extend ttlDays 非法 → fallback 7 → 200', async () => {
  const row = makePreviewRow();
  const res = await app.request(
    `/preview/${row.token}/extend`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...AUTH },
      body: JSON.stringify({ ttlDays: 365 }),
    },
    mockEnv({ authenticated: true, previewRow: row }),
    ctx,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; expiresAt: number };
  assert.equal(body.ok, true);
  // fallback 7 天，expiresAt ≈ now + 7d
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  assert.ok(Math.abs(body.expiresAt - Date.now() - sevenDays) < 5_000);
});
