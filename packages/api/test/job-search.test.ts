import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import {
  communityToIndexRow,
  type JobSearchEnv,
  type Opportunity,
  opportunityToIndexRow,
  type SqlDatabase,
  type SqlStatement,
  setJobIndexStatus,
  upsertJobIndexRows,
} from '@muicv/shared';

import app from '../src/app.ts';
import { parseSearchRequest, resolveFilters, searchAllJobs } from '../src/lib/job-search.ts';

const MIGRATION = readFileSync(new URL('../../website/migrations/0018_job_index.sql', import.meta.url), 'utf8');

/** node:sqlite → D1 形状的最小适配（真实跑 migration、FTS5 trigram、触发器）。 */
function sqliteDb(): SqlDatabase & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  raw.exec(MIGRATION);
  function prepare(sql: string): SqlStatement {
    let params: unknown[] = [];
    const stmt: SqlStatement = {
      bind(...values) {
        params = values.map((v) => (v === undefined ? null : v));
        return stmt;
      },
      async run() {
        return raw.prepare(sql).run(...(params as never[]));
      },
      async all<T>() {
        return { results: raw.prepare(sql).all(...(params as never[])) as T[] };
      },
    };
    return stmt;
  }
  return { raw, prepare };
}

function opp(id: string, over: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: 'Senior Backend Engineer',
    company: `Company${id}`,
    location: 'Remote',
    workplace: 'remote',
    allowedCountries: [],
    allowedRegions: [],
    utcOffsetMin: null,
    utcOffsetMax: null,
    officeLocations: [],
    category: 'engineering',
    summary: '',
    descriptionMarkdown: 'Build APIs with Go and Postgres',
    applyUrl: `https://jobs.example.com/${id}`,
    source: 'greenhouse',
    sourceId: id,
    dedupeKey: `greenhouse:${id}`,
    fingerprint: '',
    postedAt: `2026-10-1${id}T00:00:00.000Z`,
    status: 'published',
    tags: [],
    updatedAt: '2026-10-19T00:00:00.000Z',
    ...over,
  };
}

async function seed() {
  const db = sqliteDb();
  await upsertJobIndexRows(db, [
    opportunityToIndexRow(opp('1', { allowedCountries: ['US'], location: 'Remote - US' })),
    opportunityToIndexRow(
      opp('2', { allowedRegions: ['apac'], title: 'Kubernetes Platform Engineer', category: 'devops' }),
    ),
    opportunityToIndexRow(opp('3', { allowedRegions: ['worldwide'], utcOffsetMin: -5, utcOffsetMax: 3 })),
    opportunityToIndexRow(
      opp('4', { workplace: 'onsite', allowedCountries: ['DE'], location: 'Berlin', title: 'Frontend Engineer' }),
    ),
    communityToIndexRow({
      id: 'c1',
      canonicalUrl: 'https://www.zhipin.com/job/c1',
      sourceSite: 'boss',
      title: '高级前端工程师',
      company: '某出海公司',
      location: '远程',
      markdown: 'React 前端，远程办公，需在中国大陆。',
      status: 'published',
      createdAt: Date.parse('2026-10-18T00:00:00Z'),
    }),
  ]);
  return db;
}

const ids = (res: { items: Array<{ id: string }> }) => res.items.map((i) => i.id);

describe('jobIndex 迁移与触发器', () => {
  it('upsert / 更新同步 FTS，状态下线后搜不到', async () => {
    const db = await seed();
    const count = db.raw.prepare(`SELECT count(*) AS n FROM jobIndexFts WHERE jobIndexFts MATCH '"kub"'`).get() as {
      n: number;
    };
    assert.equal(count.n, 1);
    await upsertJobIndexRows(db, [opportunityToIndexRow(opp('2', { title: 'Data Scientist', category: 'data' }))]);
    const after = db.raw.prepare(`SELECT count(*) AS n FROM jobIndexFts WHERE jobIndexFts MATCH '"kub"'`).get() as {
      n: number;
    };
    assert.equal(after.n, 0, 'UPDATE 触发器应删除旧 FTS 行');
    await setJobIndexStatus(db, ['collected:3'], 'expired');
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({}));
    assert.ok(!ids(res).includes('collected:3'));
  });
});

describe('关键词路径（FTS trigram + LIKE）', () => {
  it('拼写错误也能命中（trigram 重叠）', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ q: 'kubernets platfrom' }));
    assert.equal(res.mode, 'keyword');
    assert.equal(res.items[0]?.id, 'collected:2');
  });

  it('中文短词走 LIKE', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ q: '前端', ignore: 'category' }));
    assert.deepEqual(ids(res), ['community:c1']);
  });
});

describe('结构化硬过滤', () => {
  it('我在中国 UTC+8：排除 US-only、时区不兼容、德国坐班', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ country: 'CN', utcOffset: '8' }));
    assert.deepEqual(ids(res).sort(), ['collected:2', 'community:c1']);
  });

  it('只给国家时按该国时区推断', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ country: 'US' }));
    assert.ok(ids(res).includes('collected:1'));
    assert.ok(ids(res).includes('collected:3'), 'US 时区与 UTC-5~+3 有交集');
    assert.ok(!ids(res).includes('collected:2'), 'APAC-only 排除');
  });

  it('region 过滤看岗位覆盖大区', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ region: 'europe' }));
    assert.deepEqual(ids(res).sort(), ['collected:3', 'collected:4']);
  });
});

describe('q 自动识别过滤 + ignore', () => {
  it('识别 country/utcOffset/workplace 并标记 detected；ignore 后不再应用', async () => {
    const r = resolveFilters(parseSearchRequest({ q: '我在中国 UTC+8 远程 kubernetes' }));
    assert.deepEqual(r.filters, { country: 'CN', utcOffset: 8, workplace: 'remote' });
    assert.deepEqual(r.detected.sort(), ['country', 'utcOffset', 'workplace']);
    const r2 = resolveFilters(
      parseSearchRequest({ q: '我在中国 远程 kubernetes', ignore: 'country', workplace: 'hybrid' }),
    );
    assert.deepEqual(r2.filters, { workplace: 'hybrid' }, '显式参数优先，ignore 的不应用');
    assert.deepEqual(r2.detected, []);
  });

  it('q 只有过滤短语时按条件看最新', async () => {
    const db = await seed();
    const res = await searchAllJobs({ db, vector: null }, parseSearchRequest({ q: '我在中国 远程' }));
    assert.equal(res.mode, 'latest');
    assert.deepEqual(res.filters, { country: 'CN', workplace: 'remote' });
  });
});

function vectorEnv(matchIds: string[], queries: unknown[] = []): JobSearchEnv {
  return {
    AI: { run: async () => ({ data: [[1, 0]] }) },
    JOBS_INDEX: {
      upsert: async () => {},
      deleteByIds: async () => {},
      query: async (_v, options) => {
        queries.push(options);
        return { matches: matchIds.map((id, i) => ({ id, score: 1 - i / 10 })) };
      },
    },
  };
}

describe('语义路径 + RRF 融合', () => {
  it('两路都命中的排第一；向量结果仍受 SQL 硬约束', async () => {
    const db = await seed();
    const queries: unknown[] = [];
    const res = await searchAllJobs(
      { db, vector: vectorEnv(['collected:1', 'collected:2', 'collected:999'], queries) },
      parseSearchRequest({ q: 'kubernetes', country: 'CN' }),
    );
    assert.equal(res.mode, 'hybrid');
    assert.equal(res.items[0]?.id, 'collected:2');
    assert.ok(!ids(res).includes('collected:1'), 'US-only 被硬约束过滤');
    assert.deepEqual((queries[0] as { filter?: unknown }).filter, undefined);
  });

  it('向量报错降级为 keyword', async () => {
    const db = await seed();
    const broken: JobSearchEnv = {
      ...vectorEnv([]),
      AI: {
        run: async () => {
          throw new Error('ai down');
        },
      },
    };
    const res = await searchAllJobs({ db, vector: broken }, parseSearchRequest({ q: 'kubernetes' }));
    assert.equal(res.mode, 'keyword');
    assert.equal(res.items[0]?.id, 'collected:2');
  });
});

describe('parseSearchRequest', () => {
  it('丢弃非法值、兼容 remote 参数名、收紧分页', () => {
    assert.deepEqual(
      parseSearchRequest({
        q: ' x ',
        remote: 'remote',
        country: 'china',
        utcOffset: '99',
        page: '-1',
        pageSize: '500',
      }),
      { q: 'x', workplace: 'remote', page: 1, pageSize: 50 },
    );
  });
});

function routeEnv(limitOk = true) {
  const db = sqliteDb();
  return {
    MUICV_API_DB: db,
    JOBS_SEARCH_ANON_LIMITER: { limit: async () => ({ success: limitOk }) },
  };
}

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} };

describe('/jobs/search 路由', () => {
  it('匿名超限返回 429', async () => {
    const res = await app.request('/jobs/search?q=go', {}, routeEnv(false) as never, ctx as never);
    assert.equal(res.status, 429);
  });

  it('返回统一结构（含 detected）', async () => {
    const res = await app.request('/jobs/search?q=%E8%BF%9C%E7%A8%8B%20golang', {}, routeEnv() as never, ctx as never);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { mode: string; detected: string[]; items: unknown[] };
    assert.equal(body.mode, 'keyword');
    assert.deepEqual(body.detected, ['workplace']);
  });

  it('reindex 缺 token 403', async () => {
    const res = await app.request('/jobs/search/reindex', { method: 'POST' }, routeEnv() as never, ctx as never);
    assert.equal(res.status, 403);
  });
});
