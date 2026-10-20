import type { JobListing, JobSearchFilters, JobSearchResponse } from '@muicv/shared';

/** 岗位搜索面板的纯状态逻辑（与 React 解耦，便于单测）。 */

export type JobSearchQuery = JobSearchFilters & { q: string };

export type JobSearchState = {
  query: JobSearchQuery;
  items: JobListing[];
  page: number;
  hasMore: boolean;
  status: 'idle' | 'loading' | 'loading-more' | 'done' | 'error';
  error: string | null;
  mode: JobSearchResponse['mode'] | null;
  /** 服务端实际生效的过滤（含从 q 自动抽取的） */
  appliedFilters: JobSearchFilters;
  selectedId: string | null;
};

export const PAGE_SIZE = 20;

export const INITIAL_STATE: JobSearchState = {
  query: { q: '' },
  items: [],
  page: 0,
  hasMore: false,
  status: 'idle',
  error: null,
  mode: null,
  appliedFilters: {},
  selectedId: null,
};

export type JobSearchAction =
  | { type: 'start'; query: JobSearchQuery }
  | { type: 'start-more' }
  | { type: 'success'; response: JobSearchResponse; append: boolean }
  | { type: 'failure'; error: string }
  | { type: 'select'; id: string | null };

function mergeById(prev: JobListing[], next: JobListing[]): JobListing[] {
  const seen = new Set(prev.map((i) => i.id));
  return [...prev, ...next.filter((i) => !seen.has(i.id))];
}

export function jobSearchReducer(state: JobSearchState, action: JobSearchAction): JobSearchState {
  switch (action.type) {
    case 'start':
      return { ...INITIAL_STATE, query: action.query, status: 'loading' };
    case 'start-more':
      return state.hasMore && state.status === 'done' ? { ...state, status: 'loading-more' } : state;
    case 'success': {
      const items = action.append ? mergeById(state.items, action.response.items) : action.response.items;
      return {
        ...state,
        items,
        page: action.response.page,
        hasMore: action.response.hasMore,
        status: 'done',
        error: null,
        mode: action.response.mode,
        appliedFilters: action.response.filters,
        selectedId: state.selectedId ?? items[0]?.id ?? null,
      };
    }
    case 'failure':
      return { ...state, status: 'error', error: action.error };
    case 'select':
      return { ...state, selectedId: action.id };
  }
}

/** 构造请求：空字符串过滤不下发。 */
export function toSearchRequest(query: JobSearchQuery, page: number) {
  return {
    ...(query.q.trim() ? { q: query.q.trim() } : {}),
    ...(query.kind ? { kind: query.kind } : {}),
    ...(query.remote ? { remote: query.remote } : {}),
    ...(query.region ? { region: query.region } : {}),
    ...(query.category ? { category: query.category } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
}

/** `collected:12` → { kind, refId }。 */
export function splitListingId(listing: JobListing): { kind: JobListing['kind']; refId: string } {
  return { kind: listing.kind, refId: listing.id.slice(listing.id.indexOf(':') + 1) };
}

export function friendlySearchError(status: number, error: string): string {
  if (status === 429) return '搜索太频繁，稍等一分钟再试（登录后额度更高）';
  if (status === 0) return `网络异常：${error}`;
  return error || `搜索失败（${status}）`;
}

export function friendlyImportError(error: string): string {
  if (error === 'no-workspace') return '还没有激活的职业档案，先在左上角选一个';
  if (error === 'job-not-found') return '岗位已下线或不存在';
  return `导入失败：${error}`;
}
