import {
  JOB_FILTER_KEYS,
  type JobFilterKey,
  type JobListing,
  type JobSearchFilters,
  type JobSearchResponse,
} from '@muicv/shared';

/** 岗位搜索面板的纯状态逻辑（与 React 解耦，便于单测）。 */

export type JobSearchQuery = JobSearchFilters & {
  q: string;
  /** 用户删掉的「自动识别」标签：不再从 q 抽取这些过滤 */
  ignore?: JobFilterKey[];
};

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
  /** appliedFilters 中由 q 自动识别出来的 key */
  detected: JobFilterKey[];
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
  detected: [],
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
        detected: action.response.detected ?? [],
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
    ...(query.workplace ? { workplace: query.workplace } : {}),
    ...(query.region ? { region: query.region } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.country ? { country: query.country } : {}),
    ...(query.utcOffset !== undefined ? { utcOffset: query.utcOffset } : {}),
    ...(query.ignore?.length ? { ignore: query.ignore } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
}

/**
 * 删除一个生效中的过滤标签：自动识别的 → 加入 ignore（q 不变）；显式选的 → 从 query 去掉。
 * 两种来源同时存在时一起处理，保证删完标签就真的消失。
 */
export function removeFilter(query: JobSearchQuery, detected: JobFilterKey[], key: JobFilterKey): JobSearchQuery {
  const next: JobSearchQuery = { ...query };
  delete next[key];
  if (detected.includes(key)) next.ignore = [...new Set([...(query.ignore ?? []), key])];
  return next;
}

/** 生效中的过滤 → 标签列表（顺序固定） */
export function activeFilterTags(
  applied: JobSearchFilters,
  detected: JobFilterKey[],
): Array<{ key: JobFilterKey; value: string | number; detected: boolean }> {
  return JOB_FILTER_KEYS.flatMap((key) => {
    const value = applied[key];
    return value === undefined || value === null ? [] : [{ key, value, detected: detected.includes(key) }];
  });
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
