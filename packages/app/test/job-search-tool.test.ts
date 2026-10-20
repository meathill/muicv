import assert from 'node:assert/strict';
import test from 'node:test';

import type { JobSearchResponse } from '@muicv/shared';

import { buildJobSearchTools, formatJobResults } from '../src/main/agent/api-tools-jobs.ts';

const RES: JobSearchResponse = {
  items: [
    {
      id: 'collected:1',
      kind: 'collected',
      title: 'Backend Engineer',
      company: 'Stripe',
      location: 'Remote - Europe',
      workplace: 'remote',
      allowedCountries: [],
      allowedRegions: ['europe'],
      utcOffsetMin: null,
      utcOffsetMax: null,
      officeLocations: [],
      category: 'engineering',
      source: 'greenhouse',
      url: 'https://boards.greenhouse.io/stripe/jobs/1',
      summary: 'Build APIs',
      postedAt: '2026-10-18T00:00:00.000Z',
      score: 0.9,
    },
  ],
  page: 1,
  pageSize: 10,
  hasMore: true,
  mode: 'hybrid',
  filters: { workplace: 'remote', country: 'CN' },
  detected: ['country'],
};

test('formatJobResults 列出岗位、来源、翻页提示', () => {
  const text = formatJobResults(RES);
  assert.match(text, /混合检索，过滤：办公：远程，我在：中国（自动识别）/);
  assert.match(text, /仅限 欧洲/);
  assert.match(text, /1\. \*\*Backend Engineer\*\* — Stripe/);
  assert.match(text, /via greenhouse/);
  assert.match(text, /page=2/);
  assert.match(formatJobResults({ ...RES, items: [], hasMore: false }), /没有找到/);
});

test('buildJobSearchTools 暴露 search_jobs', () => {
  const tools = buildJobSearchTools({ muicvApiBase: 'https://api.test', muicvApiKey: '' } as never);
  assert.deepEqual(
    tools.map((t) => t.name),
    ['search_jobs'],
  );
});
