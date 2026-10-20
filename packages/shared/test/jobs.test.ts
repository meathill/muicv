import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildJobSearchQuery,
  buildOpportunityParams,
  classifyCategory,
  classifyRegion,
  classifyRemote,
  extractFiltersFromQuery,
  fetchCmsOpportunities,
  htmlToText,
  indexJobs,
  type JobVector,
  jobFingerprint,
  parseJobVectorId,
  queryJobVectors,
  searchJobs,
  toVectorFilter,
} from '../src/jobs/index.ts';

test('分类规则：职能 / 地区 / 远程', () => {
  assert.equal(classifyCategory('Senior Backend Engineer'), 'engineering');
  assert.equal(classifyCategory('Staff Site Reliability Engineer'), 'devops');
  assert.equal(classifyCategory('Machine Learning Engineer'), 'data');
  assert.equal(classifyCategory('Account Executive'), 'other');
  assert.equal(classifyRegion('Remote - Worldwide'), 'global');
  assert.equal(classifyRegion('San Francisco, CA'), 'americas');
  assert.equal(classifyRegion('London, UK'), 'europe');
  assert.equal(classifyRegion('Singapore'), 'apac');
  assert.equal(classifyRemote('Remote, US'), 'remote');
  assert.equal(classifyRemote('New York (Hybrid)'), 'hybrid');
  assert.equal(classifyRemote('Dublin', true), 'remote');
  assert.equal(classifyRemote('Dublin'), 'onsite');
});

test('自然语言 query 抽取过滤条件（中英）', () => {
  assert.deepEqual(extractFiltersFromQuery('欧洲远程的前端工程师'), {
    remote: 'remote',
    region: 'europe',
    category: 'engineering',
  });
  assert.deepEqual(extractFiltersFromQuery('remote data scientist in Japan'), {
    remote: 'remote',
    region: 'apac',
    category: 'data',
  });
  assert.deepEqual(extractFiltersFromQuery('有意思的工作'), {});
});

test('htmlToText 处理 Greenhouse 转义 HTML', () => {
  const text = htmlToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;');
  assert.match(text, /Hello & welcome/);
  assert.match(text, /- Go/);
});

test('jobFingerprint 忽略大小写/标点/公司后缀', () => {
  assert.equal(jobFingerprint('Stripe, Inc.', 'Backend Engineer'), jobFingerprint('stripe', 'backend  engineer'));
});

test('vector id 往返', () => {
  assert.deepEqual(parseJobVectorId('community:abc-1'), { kind: 'community', refId: 'abc-1' });
  assert.equal(parseJobVectorId('x:1'), null);
});

function mockEnv() {
  const upserted: JobVector[] = [];
  const queries: Array<{ filter?: Record<string, string> }> = [];
  return {
    upserted,
    queries,
    env: {
      AI: {
        async run(_model: string, input: { text: string[] }) {
          return { data: input.text.map((t) => [t.length, 1]) };
        },
      },
      JOBS_INDEX: {
        async upsert(vectors: JobVector[]) {
          upserted.push(...vectors);
        },
        async deleteByIds() {},
        async query(_v: number[], opts: { filter?: Record<string, string> }) {
          queries.push(opts);
          return { matches: [{ id: 'collected:1', score: 0.9 }] };
        },
      },
    },
  };
}

test('indexJobs 批量 embed 并 upsert', async () => {
  const { env, upserted } = mockEnv();
  const n = await indexJobs(env, [
    {
      id: 'collected:1',
      text: 'abc',
      metadata: { kind: 'collected', refId: '1', remote: 'remote', region: 'global', category: 'data', postedAt: 1 },
    },
  ]);
  assert.equal(n, 1);
  assert.deepEqual(upserted[0]?.values, [3, 1]);
});

test('queryJobVectors 带 metadata filter', async () => {
  const { env, queries } = mockEnv();
  const matches = await queryJobVectors(env, 'remote', { remote: 'remote' }, 10);
  assert.equal(matches[0]?.id, 'collected:1');
  assert.deepEqual(queries[0]?.filter, { remote: 'remote' });
  assert.equal(toVectorFilter({}), undefined);
});

test('CMS opportunities 参数与解析', async () => {
  const params = buildOpportunityParams({ keyword: 'go', remote: 'remote', page: 2 });
  assert.equal(params.get('where[status][equals]'), 'published');
  assert.equal(params.get('where[remote][equals]'), 'remote');
  assert.equal(params.get('where[or][0][title][like]'), 'go');
  const page = await fetchCmsOpportunities(
    {},
    {
      fetchImpl: async () =>
        Response.json({
          hasNextPage: true,
          docs: [
            {
              id: 7,
              title: 'Engineer',
              company: 'Acme',
              applyUrl: 'https://x.com/1',
              postedAt: '2026-10-01T00:00:00.000Z',
              source: 'lever',
              status: 'published',
              tags: [{ value: 'go' }],
            },
            { id: 8, title: 'bad' },
          ],
        }),
    },
  );
  assert.equal(page.docs.length, 1);
  assert.equal(page.docs[0]?.id, '7');
  assert.deepEqual(page.docs[0]?.tags, ['go']);
  assert.equal(page.hasMore, true);
});

test('searchJobs 客户端拼参数与鉴权', async () => {
  assert.equal(buildJobSearchQuery({ q: '远程', page: 2 }).toString(), 'q=%E8%BF%9C%E7%A8%8B&page=2');
  let seen: Request | null = null;
  const res = await searchJobs(
    { q: 'go' },
    {
      baseUrl: 'https://api.test/',
      apiKey: 'mui_x',
      fetchImpl: async (input, init) => {
        seen = new Request(input as string, init);
        return Response.json({ items: [], page: 1, pageSize: 20, hasMore: false, mode: 'keyword', filters: {} });
      },
    },
  );
  assert.equal(res.mode, 'keyword');
  assert.equal((seen as Request | null)?.url, 'https://api.test/jobs/search?q=go');
  assert.equal((seen as Request | null)?.headers.get('authorization'), 'Bearer mui_x');
  await assert.rejects(
    searchJobs({}, { fetchImpl: async () => Response.json({ error: 'slow down' }, { status: 429 }) }),
    /slow down/,
  );
});

test('dedupeListings 按 company+title 或 url 折叠', async () => {
  const { dedupeListings } = await import('../src/jobs/index.ts');
  const base = {
    kind: 'collected' as const,
    location: '',
    remote: null,
    region: null,
    category: null,
    source: 'lever',
    summary: '',
    postedAt: '2026-10-01',
    score: null,
  };
  const out = dedupeListings([
    { ...base, id: 'collected:1', title: 'Backend Engineer', company: 'Stripe', url: 'https://a.com/1' },
    {
      ...base,
      id: 'community:x',
      kind: 'community',
      title: 'backend engineer',
      company: 'Stripe Inc.',
      url: 'https://b.com/2',
    },
    { ...base, id: 'community:y', kind: 'community', title: 'Other', company: 'Foo', url: 'https://www.a.com/1/' },
    { ...base, id: 'collected:3', title: 'Designer', company: 'Stripe', url: 'https://a.com/3' },
  ]);
  assert.deepEqual(
    out.map((i) => i.id),
    ['collected:1', 'collected:3'],
  );
});
