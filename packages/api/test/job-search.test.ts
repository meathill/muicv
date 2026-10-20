import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JobVector, Opportunity } from '@muicv/shared';

import app from '../src/app.ts';
import type { CommunityJdRow } from '../src/lib/community-jd.ts';
import { communityIndexable } from '../src/lib/job-index.ts';
import { type JobSearchDeps, parseSearchRequest, searchAllJobs } from '../src/lib/job-search.ts';

function opp(id: string, over: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: 'Backend Engineer',
    company: `Co${id}`,
    location: 'Remote - Europe',
    remote: 'remote',
    region: 'europe',
    category: 'engineering',
    summary: 's',
    descriptionMarkdown: 'Go and Postgres',
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

function jd(id: string, over: Partial<CommunityJdRow> = {}): CommunityJdRow {
  return {
    id,
    canonicalUrl: `https://www.zhipin.com/job/${id}`,
    urlHash: id,
    contentHash: id,
    sourceSite: 'boss',
    title: '前端工程师',
    company: '某厂',
    location: '上海',
    employmentType: null,
    markdown: 'React 前端',
    contributorUserId: 'u1',
    status: 'published',
    createdAt: Date.parse('2026-10-18T00:00:00Z'),
    updatedAt: 0,
    ...over,
  };
}

function deps(over: Partial<JobSearchDeps> = {}): JobSearchDeps & { queries: unknown[] } {
  const queries: unknown[] = [];
  const opps = [opp('1'), opp('2', { remote: 'onsite', region: 'americas', location: 'NYC' })];
  const jds = [jd('a'), jd('b', { title: 'Backend Engineer', company: 'Co1' })];
  return {
    queries,
    vector: {
      AI: { run: async () => ({ data: [[1, 0]] }) },
      JOBS_INDEX: {
        upsert: async () => {},
        deleteByIds: async () => {},
        query: async (_v, options) => {
          queries.push(options);
          return {
            matches: [
              { id: 'community:b', score: 0.95 },
              { id: 'collected:1', score: 0.9 },
              { id: 'community:a', score: 0.8 },
              { id: 'collected:999', score: 0.7 },
            ],
          };
        },
      },
    },
    community: {
      byIds: async (ids) => jds.filter((r) => ids.includes(r.id)),
      search: async (q) => (q ? jds.filter((r) => r.markdown.includes(q)) : jds),
    },
    collected: {
      byIds: async (ids) => opps.filter((o) => ids.includes(o.id)),
      list: async (query) =>
        opps.filter(
          (o) =>
            (!query.keyword || o.descriptionMarkdown.includes(query.keyword)) &&
            (!query.remote || o.remote === query.remote),
        ),
    },
    ...over,
  };
}

describe('searchAllJobs', () => {
  it('向量模式：按分数回源、跳过已下线条目、跨来源去重、带上 q 中抽取的过滤', async () => {
    const d = deps();
    const res = await searchAllJobs(d, parseSearchRequest({ q: '欧洲远程后端' }));
    assert.equal(res.mode, 'vector');
    assert.deepEqual(res.filters, { remote: 'remote', region: 'europe', category: 'engineering' });
    assert.deepEqual(
      d.queries.map((q) => (q as { filter: unknown }).filter),
      [{ remote: 'remote', region: 'europe', category: 'engineering' }],
    );
    // community:b 与 collected:1 同公司同职位 → 只保留分高的 community:b
    assert.deepEqual(
      res.items.map((i) => i.id),
      ['community:b', 'community:a'],
    );
    assert.equal(res.items[0]?.score, 0.95);
  });

  it('向量报错时降级关键词', async () => {
    const d = deps({
      vector: {
        AI: {
          run: async () => {
            throw new Error('ai down');
          },
        },
        JOBS_INDEX: { upsert: async () => {}, deleteByIds: async () => {}, query: async () => ({ matches: [] }) },
      },
    });
    const res = await searchAllJobs(d, parseSearchRequest({ q: 'Postgres' }));
    assert.equal(res.mode, 'keyword');
    assert.deepEqual(
      res.items.map((i) => i.id),
      ['collected:2', 'collected:1'],
    );
  });

  it('无 q：按时间倒序 + 显式过滤 + 分页', async () => {
    const res = await searchAllJobs(deps({ vector: null }), parseSearchRequest({ kind: 'collected', pageSize: '1' }));
    assert.equal(res.mode, 'latest');
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0]?.id, 'collected:2');
    assert.equal(res.hasMore, true);
  });

  it('parseSearchRequest 丢弃非法枚举并收紧分页', () => {
    assert.deepEqual(parseSearchRequest({ q: '  x ', remote: 'moon', page: '-1', pageSize: '500' }), {
      q: 'x',
      page: 1,
      pageSize: 50,
    });
  });

  it('communityIndexable 产出 community 向量 metadata', () => {
    const item = communityIndexable(jd('z', { title: 'Remote Backend Engineer', location: 'Berlin' }));
    assert.equal(item.id, 'community:z');
    assert.deepEqual(
      { ...item.metadata, postedAt: 0 },
      { kind: 'community', refId: 'z', remote: 'remote', region: 'europe', category: 'engineering', postedAt: 0 },
    );
  });
});

function routeEnv(limitOk = true) {
  const stmt = {
    bind: () => stmt,
    all: async () => ({ results: [] }),
    first: async () => null,
    run: async () => ({}),
  };
  return {
    MUICV_API_DB: { prepare: () => stmt },
    MUICV_CMS_URL: 'https://cms.invalid',
    JOBS_SEARCH_ANON_LIMITER: { limit: async () => ({ success: limitOk }) },
  };
}

const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} };

describe('/jobs/search 路由', () => {
  it('匿名超限返回 429', async () => {
    const res = await app.request('/jobs/search?q=go', {}, routeEnv(false) as never, ctx as never);
    assert.equal(res.status, 429);
  });

  it('无向量绑定时走关键词并返回统一结构', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ docs: [], hasNextPage: false });
    try {
      const res = await app.request('/jobs/search?q=go&remote=remote', {}, routeEnv() as never, ctx as never);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { mode: string; items: unknown[]; filters: unknown };
      assert.equal(body.mode, 'keyword');
      assert.deepEqual(body.items, []);
      assert.deepEqual(body.filters, { remote: 'remote' });
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('reindex 缺 token 403', async () => {
    const res = await app.request('/jobs/search/reindex', { method: 'POST' }, routeEnv() as never, ctx as never);
    assert.equal(res.status, 403);
  });
});

describe('向量 upsert 结构', () => {
  it('JobVector 类型可直接喂 Vectorize', () => {
    const v: JobVector = { id: 'community:x', values: [0], metadata: communityIndexable(jd('x')).metadata };
    assert.equal(v.metadata.kind, 'community');
  });
});
