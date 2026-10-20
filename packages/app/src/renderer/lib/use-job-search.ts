import { useCallback, useReducer, useRef } from 'react';

import {
  friendlySearchError,
  INITIAL_STATE,
  type JobSearchQuery,
  jobSearchReducer,
  toSearchRequest,
} from './job-search-state';

/** 岗位搜索 hook：搜索 / 加载更多 / 选中。旧请求的结果按序号丢弃，避免竞态覆盖。 */
export function useJobSearch() {
  const [state, dispatch] = useReducer(jobSearchReducer, INITIAL_STATE);
  const seq = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const search = useCallback(async (query: JobSearchQuery) => {
    const current = ++seq.current;
    dispatch({ type: 'start', query });
    const res = await window.muicv.jobs.search(toSearchRequest(query, 1));
    if (current !== seq.current) return;
    if (res.ok) dispatch({ type: 'success', response: res.data, append: false });
    else dispatch({ type: 'failure', error: friendlySearchError(res.status, res.error) });
  }, []);

  const loadMore = useCallback(async () => {
    const s = stateRef.current;
    if (!s.hasMore || s.status !== 'done') return;
    const current = seq.current;
    dispatch({ type: 'start-more' });
    const res = await window.muicv.jobs.search(toSearchRequest(s.query, s.page + 1));
    if (current !== seq.current) return;
    if (res.ok) dispatch({ type: 'success', response: res.data, append: true });
    else dispatch({ type: 'failure', error: friendlySearchError(res.status, res.error) });
  }, []);

  const select = useCallback((id: string | null) => dispatch({ type: 'select', id }), []);

  return { state, search, loadMore, select };
}
