import assert from 'node:assert/strict';
import test from 'node:test';

import type { JobListing, JobSearchResponse } from '@muicv/shared';

import {
  activeFilterTags,
  friendlyImportError,
  friendlySearchError,
  INITIAL_STATE,
  jobSearchReducer,
  removeFilter,
  splitListingId,
  toSearchRequest,
} from '../src/renderer/lib/job-search-state.ts';

function listing(id: string): JobListing {
  return {
    id,
    kind: id.startsWith('community') ? 'community' : 'collected',
    title: 't',
    company: 'c',
    location: '',
    workplace: 'remote',
    allowedCountries: [],
    allowedRegions: [],
    utcOffsetMin: null,
    utcOffsetMax: null,
    officeLocations: [],
    category: 'engineering',
    source: 'lever',
    url: 'https://x',
    summary: '',
    postedAt: '2026-10-01',
    score: null,
  };
}

function response(ids: string[], page: number, hasMore: boolean): JobSearchResponse {
  return {
    items: ids.map(listing),
    page,
    pageSize: 20,
    hasMore,
    mode: 'hybrid',
    filters: { workplace: 'remote' },
    detected: ['workplace'],
  };
}

test('搜索 → 成功：选中第一条，记录生效过滤', () => {
  let s = jobSearchReducer(INITIAL_STATE, { type: 'start', query: { q: '远程' } });
  assert.equal(s.status, 'loading');
  s = jobSearchReducer(s, {
    type: 'success',
    response: response(['collected:1', 'collected:2'], 1, true),
    append: false,
  });
  assert.equal(s.selectedId, 'collected:1');
  assert.deepEqual(s.appliedFilters, { workplace: 'remote' });
  assert.deepEqual(s.detected, ['workplace']);
  assert.equal(s.status, 'done');
});

test('加载更多：追加并按 id 去重；无更多时 start-more 不生效', () => {
  let s = jobSearchReducer(INITIAL_STATE, { type: 'start', query: { q: '' } });
  s = jobSearchReducer(s, { type: 'success', response: response(['collected:1'], 1, true), append: false });
  s = jobSearchReducer(s, { type: 'start-more' });
  assert.equal(s.status, 'loading-more');
  s = jobSearchReducer(s, {
    type: 'success',
    response: response(['collected:1', 'community:a'], 2, false),
    append: true,
  });
  assert.deepEqual(
    s.items.map((i) => i.id),
    ['collected:1', 'community:a'],
  );
  assert.equal(jobSearchReducer(s, { type: 'start-more' }), s);
});

test('失败保留已有结果；新搜索重置状态', () => {
  let s = jobSearchReducer(INITIAL_STATE, { type: 'start', query: { q: '' } });
  s = jobSearchReducer(s, { type: 'success', response: response(['collected:1'], 1, true), append: false });
  s = jobSearchReducer(s, { type: 'failure', error: 'boom' });
  assert.equal(s.items.length, 1);
  assert.equal(s.error, 'boom');
  s = jobSearchReducer(s, { type: 'start', query: { q: 'x', kind: 'community' } });
  assert.equal(s.items.length, 0);
  assert.equal(s.selectedId, null);
});

test('toSearchRequest 丢空字段；splitListingId 拆 id', () => {
  assert.deepEqual(toSearchRequest({ q: '  ', workplace: 'remote' }, 2), {
    workplace: 'remote',
    page: 2,
    pageSize: 20,
  });
  assert.deepEqual(toSearchRequest({ q: 'go', country: 'CN', utcOffset: 0, ignore: ['region'] }, 1), {
    q: 'go',
    country: 'CN',
    utcOffset: 0,
    ignore: ['region'],
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(splitListingId(listing('community:ab:c')), { kind: 'community', refId: 'ab:c' });
});

test('错误文案', () => {
  assert.match(friendlySearchError(429, ''), /太频繁/);
  assert.match(friendlySearchError(0, 'offline'), /网络异常/);
  assert.match(friendlyImportError('no-workspace'), /职业档案/);
});

test('删除筛选标签：自动识别的进 ignore，手动选的直接去掉', () => {
  const query = { q: '我在中国，远程后端', category: 'engineering' as const };
  const detected = ['country' as const, 'workplace' as const];
  assert.deepEqual(removeFilter(query, detected, 'country'), { ...query, ignore: ['country'] });
  assert.deepEqual(removeFilter(query, detected, 'category'), { q: query.q });
  assert.deepEqual(
    activeFilterTags({ workplace: 'remote', country: 'CN', category: 'engineering' }, detected).map(
      (t) => `${t.key}:${t.detected}`,
    ),
    ['workplace:true', 'category:false', 'country:true'],
  );
});
