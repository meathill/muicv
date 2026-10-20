import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

import type { JobVector, OpportunityInput, SqlDatabase } from '@muicv/shared';

import type { CmsWriter } from '../src/cms-client.ts';
import { createCmsWriter } from '../src/cms-client.ts';
import { collectOpportunities } from '../src/collect.ts';
import { extractWithLlm, needsLlm } from '../src/llm-location.ts';
import { normalizeJob } from '../src/normalize.ts';

/** node:sqlite 包一层 D1 形状，跑真实的 0018 迁移 */
function sqliteD1(): { db: SqlDatabase; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync(new URL('../../website/migrations/0018_job_index.sql', import.meta.url), 'utf8'));
  function prepare(sql: string) {
    let args: unknown[] = [];
    const stmt = {
      bind(...values: unknown[]) {
        args = values;
        return stmt;
      },
      async run() {
        raw.prepare(sql).run(...(args as never[]));
        return {};
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...(args as never[])) as T[] };
      },
      async first<T>() {
        return (raw.prepare(sql).get(...(args as never[])) ?? null) as T | null;
      },
    };
    return stmt;
  }
  const db = {
    prepare,
    async batch(stmts: Array<{ run(): Promise<unknown> }>) {
      for (const s of stmts) await s.run();
      return [];
    },
  } as unknown as SqlDatabase;
  return { db, raw };
}

const NOW = new Date('2026-10-20T00:00:00Z');
const RECENT = '2026-10-15T00:00:00Z';
const OLD = '2026-08-01T00:00:00Z';

const FIXTURES: Record<string, unknown> = {
  'https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true': {
    jobs: [
      {
        id: 1,
        title: 'Senior Backend Engineer',
        company_name: 'Acme',
        location: { name: 'Remote - US' },
        content: '&lt;p&gt;Build APIs&lt;/p&gt;',
        absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
        first_published: RECENT,
      },
      {
        id: 2,
        title: 'Account Executive',
        company_name: 'Acme',
        location: { name: 'NYC' },
        absolute_url: 'https://x/2',
        first_published: RECENT,
      },
      {
        id: 3,
        title: 'Data Scientist',
        company_name: 'Acme',
        location: { name: 'London' },
        absolute_url: 'https://x/3',
        first_published: OLD,
      },
    ],
  },
  'https://api.lever.co/v0/postings/beta?mode=json': [
    {
      id: 'l1',
      text: 'Frontend Developer',
      categories: { location: 'Berlin', commitment: 'Full-time' },
      workplaceType: 'hybrid',
      descriptionPlain: 'React',
      hostedUrl: 'https://jobs.lever.co/beta/l1',
      createdAt: Date.parse(RECENT),
    },
  ],
  'https://api.ashbyhq.com/posting-api/job-board/gamma': {
    jobs: [
      {
        id: 'a1',
        title: 'Site Reliability Engineer',
        location: 'Singapore',
        isRemote: false,
        isListed: true,
        publishedAt: RECENT,
        jobUrl: 'https://jobs.ashbyhq.com/gamma/a1',
        descriptionPlain: 'k8s',
      },
      { id: 'a2', title: 'Hidden Engineer', isListed: false, publishedAt: RECENT, jobUrl: 'https://x' },
    ],
  },
  'https://remotive.com/api/remote-jobs?category=software-dev&limit=100': {
    jobs: [
      {
        id: 99,
        title: 'Senior Backend Engineer',
        company_name: 'Acme Inc.',
        candidate_required_location: 'Worldwide',
        description: '<p>dup</p>',
        url: 'https://remotive.com/remote-jobs/99',
        publication_date: '2026-10-14T00:00:00',
      },
    ],
  },
};

const fakeFetch: typeof fetch = async (input) => {
  const url = String(input);
  if (url in FIXTURES) return Response.json(FIXTURES[url]);
  return new Response('nope', { status: 404 });
};

function memoryCms(seed: string[] = []) {
  const created: OpportunityInput[] = [];
  const cms: CmsWriter = {
    async listExistingKeys() {
      return { dedupeKeys: new Set(seed), fingerprints: new Set() };
    },
    async create(doc) {
      created.push(doc);
      return String(created.length);
    },
    async expireBefore() {
      return ['old-1'];
    },
  };
  return { cms, created };
}

function memorySearch() {
  const upserted: JobVector[] = [];
  const deleted: string[] = [];
  return {
    upserted,
    deleted,
    env: {
      AI: { run: async (_m: string, input: { text: string[] }) => ({ data: input.text.map(() => [0.1, 0.2]) }) },
      JOBS_INDEX: {
        upsert: async (v: JobVector[]) => {
          upserted.push(...v);
        },
        deleteByIds: async (ids: string[]) => {
          deleted.push(...ids);
        },
        query: async () => ({ matches: [] }),
      },
    },
  };
}

const SEEDS = [
  { source: 'greenhouse' as const, token: 'acme', name: 'Acme' },
  { source: 'lever' as const, token: 'beta', name: 'Beta' },
  { source: 'ashby' as const, token: 'gamma', name: 'Gamma' },
  { source: 'ashby' as const, token: 'broken', name: 'Broken' },
];

test('采集：过滤非技术 / 过旧 / 未上架，跨来源指纹去重，写 CMS 并建向量', async () => {
  const { cms, created } = memoryCms();
  const search = memorySearch();
  const d1 = sqliteD1();
  d1.raw.exec(
    "INSERT INTO jobIndex (id, kind, refId, title, company, workplace, category, source, url, fingerprint, urlKey, status, postedAt, updatedAt) VALUES ('collected:old-1','collected','old-1','Old','X','remote','engineering','lever','u','f','u','published',0,0)",
  );
  const report = await collectOpportunities({
    fetchImpl: fakeFetch,
    cms,
    db: d1.db,
    search: search.env,
    llm: null,
    now: NOW,
    maxAgeDays: 30,
    maxNewPerRun: 100,
    seeds: SEEDS,
    remotiveCategories: ['software-dev'],
  });

  assert.deepEqual(created.map((d) => d.dedupeKey).sort(), ['ashby:a1', 'greenhouse:1', 'lever:l1']);
  assert.equal(report.skippedOld, 1);
  assert.equal(report.skippedDuplicate, 1, 'Remotive 上同公司同职位应被折叠');
  assert.equal(report.errors.length, 1, 'broken 源报错但不影响其它源');
  assert.equal(report.expired, 1);
  assert.equal(search.upserted.length, 3);
  assert.equal(search.upserted[0]?.metadata.kind, 'collected');
  assert.deepEqual(search.deleted, ['collected:old-1']);

  const lever = created.find((d) => d.source === 'lever');
  assert.equal(lever?.workplace, 'hybrid');
  assert.deepEqual(lever?.allowedCountries, ['DE']);
  const gh = created.find((d) => d.source === 'greenhouse');
  assert.equal(gh?.workplace, 'remote');
  assert.deepEqual(gh?.allowedCountries, ['US']);

  const rows = d1.raw.prepare('SELECT id, status, allowedCountries FROM jobIndex ORDER BY id').all() as Array<{
    id: string;
    status: string;
    allowedCountries: string;
  }>;
  assert.equal(rows.length, 4);
  assert.equal(rows.find((r) => r.id === 'collected:old-1')?.status, 'expired');
  assert.ok(rows.some((r) => r.allowedCountries === ',US,'));
  assert.match(gh?.descriptionMarkdown ?? '', /Build APIs/);
});

test('采集：已存在的 dedupeKey 不重复创建，且受单次配额限制', async () => {
  const { cms, created } = memoryCms(['greenhouse:1']);
  const report = await collectOpportunities({
    fetchImpl: fakeFetch,
    cms,
    db: null,
    search: null,
    llm: null,
    now: NOW,
    maxAgeDays: 30,
    maxNewPerRun: 1,
    seeds: SEEDS,
    remotiveCategories: [],
  });
  assert.equal(created.length, 1);
  assert.notEqual(created[0]?.dedupeKey, 'greenhouse:1');
  assert.equal(report.indexed, 0);
});

test('normalizeJob 丢弃缺字段与非法时间', () => {
  const base = { source: 'lever' as const, sourceId: '1', company: 'A', location: '', applyUrl: 'https://x' };
  assert.equal(normalizeJob({ ...base, title: '', postedAt: RECENT }), null);
  assert.equal(normalizeJob({ ...base, title: 'Engineer', postedAt: 'garbage' }), null);
  assert.ok(normalizeJob({ ...base, title: 'Engineer', postedAt: RECENT }));
});

test('CMS writer：API key 头、新建带 tags 数组、批量过期', async () => {
  const calls: Request[] = [];
  const writer = createCmsWriter('https://cms.test/', 'k1', async (input, init) => {
    const req = new Request(String(input), init);
    calls.push(req);
    if (req.method === 'POST') return Response.json({ doc: { id: 42 } });
    if (req.method === 'PATCH') return Response.json({ docs: [{ id: 5 }] });
    return Response.json({ docs: [{ dedupeKey: 'lever:1', fingerprint: 'a|b' }] });
  });
  const keys = await writer.listExistingKeys(RECENT);
  assert.ok(keys.dedupeKeys.has('lever:1'));
  const doc = normalizeJob({
    source: 'lever',
    sourceId: '1',
    title: 'Engineer',
    company: 'A',
    location: '',
    applyUrl: 'https://x',
    postedAt: RECENT,
    tags: ['go'],
  });
  assert.ok(doc);
  assert.equal(await writer.create(doc), '42');
  assert.deepEqual(await writer.expireBefore(RECENT), ['5']);
  assert.equal(calls[0]?.headers.get('authorization'), 'users API-Key k1');
  const posted = (await calls[1]?.json()) as { tags: unknown };
  assert.deepEqual(posted.tags, [{ value: 'go' }]);
  assert.match(calls[2]?.url ?? '', /where%5Bstatus%5D%5Bequals%5D=published/);
});

test('LLM 兜底：仅对规则没解析出限制、但有限制句的 remote 岗调用，并校验输出', async () => {
  const doc = normalizeJob({
    source: 'lever',
    sourceId: 'x',
    title: 'Backend Engineer',
    company: 'A',
    location: 'Remote',
    workplace: 'remote',
    plain: 'You must be legally authorized to work in the country where our entity operates.',
    applyUrl: 'https://x',
    postedAt: RECENT,
  });
  assert.ok(doc);
  assert.equal(needsLlm(doc), true);
  const ai = {
    async run() {
      return { response: 'Sure: {"countries":["us","XX"],"regions":["americas","mars"],"utcMin":-5,"utcMax":-8}' };
    },
  };
  const out = await extractWithLlm(ai, doc);
  assert.deepEqual(out.allowedCountries, ['US']);
  assert.deepEqual(out.allowedRegions, ['americas']);
  assert.equal(out.utcOffsetMin, -8);
  assert.equal(out.utcOffsetMax, -5);
  assert.equal(needsLlm({ ...doc, allowedCountries: ['US'] }), false);
});
