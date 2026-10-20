import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import type { OpportunityInput } from '@muicv/shared';

import type { CmsWriter } from '../src/cron/cms-client.ts';
import { collectOpportunities } from '../src/cron/collect.ts';
import { groupForCron, NICHE_CRON } from '../src/cron/index.ts';
import { normalizeJob } from '../src/cron/normalize.ts';
import { NICHE_FEEDS, nicheFeedRequests } from '../src/cron/seeds.ts';
import {
  fetchGolangProjects,
  fetchHimalayas,
  fetchJobicy,
  fetchLaraJobs,
  fetchRemoteOk,
  fetchVueJobs,
  fetchWeWorkRemotely,
  fixMojibake,
} from '../src/cron/sources/niche.ts';
import { cleanUrl, decodeEntities, parseRssItems } from '../src/cron/sources/rss.ts';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/niche/${name}`, import.meta.url), 'utf8');
}

const ROUTES: Record<string, string> = {
  'https://vuejobs.com/feed': 'vuejobs.xml',
  'https://larajobs.com/feed': 'larajobs.xml',
  'https://weworkremotely.com/categories/remote-programming-jobs.rss': 'wwr.xml',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss': 'wwr.xml',
  'https://www.golangprojects.com/rss.xml': 'golang.xml',
  'https://remoteok.com/api': 'remoteok.json',
  'https://himalayas.app/jobs/api?limit=20': 'himalayas.json',
  'https://jobicy.com/api/v2/remote-jobs?count=50&industry=engineering': 'jobicy.json',
};

const calls: string[] = [];
const fakeFetch: typeof fetch = async (input) => {
  const url = String(input);
  calls.push(url);
  const name = ROUTES[url];
  return name ? new Response(fixture(name)) : new Response('nope', { status: 404 });
};

const NOW = new Date('2026-10-20T13:00:00Z');

function normalized(raws: Parameters<typeof normalizeJob>[0][]): OpportunityInput[] {
  return raws.map(normalizeJob).filter((d): d is OpportunityInput => d !== null);
}

test('RSS 解析：CDATA / 实体 / 命名空间标签 / utm 清理', () => {
  const [item] = parseRssItems(fixture('larajobs.xml'));
  assert.equal(item?.get('job:company'), 'Trybe');
  assert.equal(item?.get('title'), 'Senior Laravel Developer');
  assert.equal(decodeEntities('A &amp; B &#039;x&#039; &#x4e2d;'), "A & B 'x' 中");
  assert.equal(cleanUrl('https://a.com/x?utm_source=rss&id=1'), 'https://a.com/x?id=1');
});

test('VueJobs：从 description 取雇主 / 地点，链接去 utm', async () => {
  const [doc] = normalized(await fetchVueJobs(fakeFetch));
  assert.equal(doc?.company, 'Acme');
  assert.equal(doc?.applyUrl, 'https://vuejobs.com/jobs/acme-senior-frontend-engineer');
  assert.equal(doc?.workplace, 'remote');
  assert.ok(doc?.allowedRegions.includes('europe'));
});

test('LaraJobs：job:* 扩展字段，混合办公 + 英国', async () => {
  const [doc] = normalized(await fetchLaraJobs(fakeFetch));
  assert.equal(doc?.company, 'Trybe');
  assert.equal(doc?.workplace, 'hybrid');
  assert.deepEqual(doc?.allowedCountries, ['GB']);
  assert.ok(doc?.tags.includes('laravel'));
});

test('We Work Remotely：标题拆公司，region 解析为仅限美国', async () => {
  const [doc] = normalized(await fetchWeWorkRemotely(fakeFetch, 'remote-programming-jobs'));
  assert.equal(doc?.company, 'Beta Corp');
  assert.equal(doc?.title, 'Backend Engineer & Platform');
  assert.deepEqual(doc?.allowedCountries, ['US']);
});

test('Remote OK：跳过 legal 项，applyUrl 为 Remote OK 原帖（条款要求回链）', async () => {
  const docs = normalized(await fetchRemoteOk(fakeFetch));
  assert.equal(docs.length, 1);
  assert.match(docs[0]?.applyUrl ?? '', /^https:\/\/remoteok\.com\//);
  assert.ok(docs[0]?.allowedRegions.includes('worldwide'));
});

test('Himalayas：国家 + 时区限制直接来自 API，非技术岗被过滤，链接用 Himalayas 原帖', async () => {
  const docs = normalized(await fetchHimalayas(fakeFetch, 3));
  assert.equal(docs.length, 1, '库存采购被 classifyCategory 过滤');
  const [doc] = docs;
  assert.deepEqual(doc?.allowedCountries.sort(), ['DE', 'PL']);
  assert.equal(doc?.utcOffsetMin, 0);
  assert.equal(doc?.utcOffsetMax, 2);
  assert.equal(doc?.applyUrl, 'https://himalayas.app/companies/delta/jobs/staff-software-engineer');
  assert.equal(calls.filter((u) => u.startsWith('https://himalayas.app')).length, 1, 'nextCursor 为空即停止翻页');
});

test('Remote OK 乱码还原只作用于双重编码文本', () => {
  assert.equal(fixMojibake('Sotheby\u00e2\u0080\u0099s'), 'Sotheby’s');
  assert.equal(fixMojibake('Café Zürich'), 'Café Zürich');
  assert.equal(fixMojibake('中文 Go'), '中文 Go');
});

test('Jobicy 与 Golangprojects', async () => {
  const [j] = normalized(await fetchJobicy(fakeFetch, 'engineering'));
  assert.equal(j?.company, 'Paddle');
  assert.deepEqual(j?.allowedCountries.sort(), ['CA', 'GB']);
  const [g] = normalized(await fetchGolangProjects(fakeFetch));
  assert.equal(g?.company, 'Rain');
  assert.equal(g?.title, 'Senior Backend Engineer');
  assert.ok(g?.allowedRegions.includes('europe'));
});

test('cron 分组：0 0,12 跑垂直岗位板，其余跑 ATS；niche 组只请求垂直源', async () => {
  assert.equal(groupForCron(NICHE_CRON), 'niche');
  assert.equal(groupForCron('17 */6 * * *'), 'ats');
  assert.equal(groupForCron(undefined), 'ats');
  assert.equal(nicheFeedRequests(NICHE_FEEDS), 10);

  calls.length = 0;
  const created: OpportunityInput[] = [];
  const cms: CmsWriter = {
    async listExistingKeys() {
      return { dedupeKeys: new Set(), fingerprints: new Set() };
    },
    async create(doc) {
      created.push(doc);
      return String(created.length);
    },
    async expireBefore() {
      return [];
    },
  };
  const report = await collectOpportunities({
    fetchImpl: fakeFetch,
    cms,
    db: null,
    search: null,
    llm: null,
    now: NOW,
    maxAgeDays: 30,
    maxNewPerRun: 100,
    group: 'niche',
  });
  assert.ok(calls.every((u) => !u.includes('greenhouse') && !u.includes('lever.co') && !u.includes('remotive')));
  assert.deepEqual(report.errors, []);
  assert.equal(report.skippedDuplicate, 1, 'WWR 两个分类里的同一岗位按 dedupeKey 折叠');
  assert.deepEqual([...new Set(created.map((d) => d.source))].sort(), [
    'golangprojects',
    'himalayas',
    'jobicy',
    'larajobs',
    'remoteok',
    'vuejobs',
    'weworkremotely',
  ]);
});
