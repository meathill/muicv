import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildFtsPlan,
  buildJobSearchQuery,
  classifyCategory,
  coveredRegions,
  dedupeListings,
  detectQueryFilters,
  fetchCmsOpportunities,
  findCountries,
  findUtcRange,
  htmlToText,
  indexJobs,
  isEligible,
  type JobListing,
  type JobVector,
  jobFingerprint,
  parseJobVectorId,
  parseLocationRestrictions,
  queryJobVectors,
  reciprocalRankFusion,
  searchJobs,
  toVectorFilter,
} from '../src/jobs/index.ts';

test('职能分类', () => {
  assert.equal(classifyCategory('Senior Backend Engineer'), 'engineering');
  assert.equal(classifyCategory('Staff Site Reliability Engineer'), 'devops');
  assert.equal(classifyCategory('Machine Learning Engineer'), 'data');
  assert.equal(classifyCategory('Account Executive'), 'other');
});

test('国家识别：大写缩写、城市、中文，不误伤普通单词', () => {
  assert.deepEqual(findCountries('Remote - US'), ['US']);
  assert.deepEqual(findCountries('San Francisco, CA'), ['US']);
  assert.deepEqual(findCountries('Remote, United States or Canada').sort(), ['CA', 'US']);
  assert.deepEqual(findCountries('上海'), ['CN']);
  assert.deepEqual(findCountries('join us to build things'), []);
});

test('时区识别', () => {
  assert.deepEqual(findUtcRange('UTC-5 to UTC+3'), [-5, 3]);
  assert.deepEqual(findUtcRange('GMT+1'), [1, 1]);
  assert.deepEqual(findUtcRange('within 3 hours of CET'), [-2, 4]);
  assert.deepEqual(findUtcRange('must work in US time zones'), [-10, -4]);
  assert.deepEqual(findUtcRange('UTC+5:30'), [5.5, 5.5]);
  assert.equal(findUtcRange('no tz here'), null);
});

test('地域限制解析：location 字段 + 正文限制句', () => {
  const us = parseLocationRestrictions({ locations: ['Remote - US'] });
  assert.equal(us.workplace, 'remote');
  assert.deepEqual(us.allowedCountries, ['US']);

  const emea = parseLocationRestrictions({ locations: ['Remote (EMEA)'], workplaceHint: true });
  assert.deepEqual(emea.allowedRegions, ['emea']);

  const ww = parseLocationRestrictions({ locations: ['Worldwide'], workplaceHint: 'remote' });
  assert.deepEqual(ww.allowedRegions, ['worldwide']);

  const body = parseLocationRestrictions({
    locations: ['Remote'],
    body: 'We were founded in Germany. Candidates must be based in Canada and overlap with UTC-5 to UTC-3.',
  });
  assert.deepEqual(body.allowedCountries, ['CA']);
  assert.deepEqual([body.utcOffsetMin, body.utcOffsetMax], [-5, -3]);

  const office = parseLocationRestrictions({ locations: ['Hybrid - London'], title: 'Engineer' });
  assert.equal(office.workplace, 'hybrid');
  assert.deepEqual(office.allowedCountries, ['GB']);
  assert.deepEqual(office.officeLocations, ['London']);
  assert.deepEqual(coveredRegions(office).sort(), ['emea', 'europe']);
});

test('资格判断：在中国 UTC+8 排除 US-only 与美洲时区岗', () => {
  const user = { country: 'CN', utcRange: [8, 8] as [number, number] };
  const base = { allowedCountries: [], allowedRegions: [], utcOffsetMin: null, utcOffsetMax: null };
  assert.equal(isEligible({ ...base, allowedCountries: ['US'] }, user), false);
  assert.equal(isEligible({ ...base, allowedRegions: ['apac'] }, user), true);
  assert.equal(isEligible({ ...base, allowedRegions: ['worldwide'], utcOffsetMin: -5, utcOffsetMax: 3 }, user), false);
  assert.equal(isEligible(base, user), true, '未声明限制视为不限');
});

test('query 过滤识别并返回残余文本', () => {
  const a = detectQueryFilters('我在中国，UTC+8，想找远程前端工程师');
  assert.deepEqual(a.filters, { country: 'CN', utcOffset: 8, workplace: 'remote', category: 'engineering' });
  assert.doesNotMatch(a.residual, /中国|UTC|远程/);
  assert.match(a.residual, /前端/);
  const b = detectQueryFilters('欧洲远程的后端');
  assert.deepEqual(b.filters, { workplace: 'remote', region: 'europe', category: 'engineering' });
  assert.deepEqual(detectQueryFilters('有意思的工作').filters, {});
});

test('FTS trigram 计划：长词拆 trigram，短词走 LIKE', () => {
  const plan = buildFtsPlan('Kubernets 前端 go');
  assert.match(plan.match, /"kub" OR "ube"/);
  assert.deepEqual(plan.shortTerms.sort(), ['go', '前端']);
  assert.equal(buildFtsPlan('').match, '');
  assert.deepEqual(buildFtsPlan('a"bc'), { match: '', shortTerms: ['a', 'bc'] }, '引号不会进入 MATCH');
});

test('RRF 融合：两路都靠前的排第一', () => {
  const fused = reciprocalRankFusion([
    ['a', 'b', 'c'],
    ['b', 'd'],
  ]);
  assert.equal(fused[0]?.id, 'b');
  assert.deepEqual(fused.map((f) => f.id).sort(), ['a', 'b', 'c', 'd']);
});

test('htmlToText 处理 Greenhouse 转义 HTML', () => {
  const text = htmlToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;');
  assert.match(text, /Hello & welcome/);
  assert.match(text, /- Go/);
});

test('jobFingerprint / vector id', () => {
  assert.equal(jobFingerprint('Stripe, Inc.', 'Backend Engineer'), jobFingerprint('stripe', 'backend  engineer'));
  assert.deepEqual(parseJobVectorId('community:abc-1'), { kind: 'community', refId: 'abc-1' });
  assert.equal(parseJobVectorId('x:1'), null);
});

function mockVectorEnv() {
  const upserted: JobVector[] = [];
  const queries: Array<{ filter?: Record<string, string> }> = [];
  return {
    upserted,
    queries,
    env: {
      AI: { run: async (_m: string, input: { text: string[] }) => ({ data: input.text.map((t) => [t.length, 1]) }) },
      JOBS_INDEX: {
        upsert: async (v: JobVector[]) => {
          upserted.push(...v);
        },
        deleteByIds: async () => {},
        query: async (_v: number[], opts: { filter?: Record<string, string> }) => {
          queries.push(opts);
          return { matches: [{ id: 'collected:1', score: 0.9 }] };
        },
      },
    },
  };
}

test('向量：upsert 与带 metadata filter 的查询', async () => {
  const { env, upserted, queries } = mockVectorEnv();
  await indexJobs(env, [
    {
      id: 'collected:1',
      text: 'abc',
      metadata: { kind: 'collected', refId: '1', workplace: 'remote', category: 'data', postedAt: 1 },
    },
  ]);
  assert.deepEqual(upserted[0]?.values, [3, 1]);
  const matches = await queryJobVectors(env, 'q', { workplace: 'remote', country: 'CN' }, 10);
  assert.equal(matches[0]?.id, 'collected:1');
  assert.deepEqual(queries[0]?.filter, { workplace: 'remote' }, '国家不下推到 Vectorize');
  assert.equal(toVectorFilter({}), undefined);
});

test('CMS opportunities 解析新地域字段', async () => {
  const page = await fetchCmsOpportunities(
    {},
    {
      fetchImpl: async () =>
        Response.json({
          hasNextPage: false,
          docs: [
            {
              id: 7,
              title: 'Engineer',
              company: 'Acme',
              applyUrl: 'https://x.com/1',
              postedAt: '2026-10-01T00:00:00.000Z',
              source: 'lever',
              workplace: 'remote',
              allowedCountries: ['us'],
              allowedRegions: ['emea', 'mars'],
              utcOffsetMin: -5,
              utcOffsetMax: 3,
            },
          ],
        }),
    },
  );
  const doc = page.docs[0];
  assert.deepEqual(doc?.allowedCountries, ['US']);
  assert.deepEqual(doc?.allowedRegions, ['emea']);
  assert.equal(doc?.utcOffsetMax, 3);
});

test('searchJobs 客户端拼参数（含 ignore / 国家 / 时区）与 429', async () => {
  assert.equal(
    buildJobSearchQuery({ q: 'go', country: 'CN', utcOffset: 8, ignore: ['region', 'category'] }).toString(),
    'q=go&country=CN&utcOffset=8&ignore=region%2Ccategory',
  );
  let seen: Request | null = null;
  await searchJobs(
    { q: 'go' },
    {
      baseUrl: 'https://api.test/',
      apiKey: 'mui_x',
      fetchImpl: async (input, init) => {
        seen = new Request(String(input), init);
        return Response.json({});
      },
    },
  );
  assert.equal((seen as Request | null)?.headers.get('authorization'), 'Bearer mui_x');
  await assert.rejects(
    searchJobs({}, { fetchImpl: async () => Response.json({ error: 'slow down' }, { status: 429 }) }),
    /slow down/,
  );
});

test('dedupeListings 按 company+title 或 url 折叠', () => {
  const base = {
    kind: 'collected' as const,
    location: '',
    workplace: 'remote' as const,
    allowedCountries: [],
    allowedRegions: [],
    utcOffsetMin: null,
    utcOffsetMax: null,
    officeLocations: [],
    category: 'engineering' as const,
    source: 'lever',
    summary: '',
    postedAt: '2026-10-01',
    score: null,
  };
  const items: JobListing[] = [
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
  ];
  assert.deepEqual(
    dedupeListings(items).map((i) => i.id),
    ['collected:1'],
  );
});

test('地域文案：describeRestrictions / filterTagLabel / formatUtc', async () => {
  const { describeRestrictions, filterTagLabel, formatUtc } = await import('../src/jobs/labels.ts');
  assert.equal(
    describeRestrictions({
      workplace: 'remote',
      allowedCountries: ['US', 'CA'],
      allowedRegions: [],
      utcOffsetMin: -8,
      utcOffsetMax: -5,
    }),
    '仅限 美国 / 加拿大 · UTC-8 ~ UTC-5',
  );
  assert.equal(
    describeRestrictions({
      workplace: 'remote',
      allowedCountries: [],
      allowedRegions: [],
      utcOffsetMin: null,
      utcOffsetMax: null,
    }),
    '不限地区',
  );
  assert.equal(formatUtc(5.5), 'UTC+5:30');
  assert.equal(filterTagLabel('country', 'CN'), '我在：中国');
  assert.equal(filterTagLabel('utcOffset', 8), '时区：UTC+8');
});
