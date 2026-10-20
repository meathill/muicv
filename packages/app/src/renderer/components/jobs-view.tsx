import { BriefcaseIcon } from '@phosphor-icons/react';
import { useCallback, useEffect } from 'react';

import { useJobSearch } from '../lib/use-job-search';
import { JobDetailPanel } from './jobs/job-detail-panel';
import { JobResultList } from './jobs/job-result-list';
import { JobSearchBar } from './jobs/job-search-bar';

const MODE_HINT = { vector: '语义匹配', keyword: '关键词匹配（语义搜索暂不可用）', latest: '最新岗位' } as const;

/**
 * 岗位库：自然语言搜 muicv 统一岗位（采集 + 社区 JD），左列表右详情。
 * 数据走 main 代理的 /jobs/search（与 agent search_jobs 工具同源）。
 */
export function JobsView() {
  const { state, search, loadMore, select } = useJobSearch();

  useEffect(() => {
    void search({ q: '' });
  }, [search]);

  const handleLoadMore = useCallback(() => void loadMore(), [loadMore]);
  const selected = state.items.find((i) => i.id === state.selectedId) ?? null;
  const applied = Object.values(state.appliedFilters).filter(Boolean).length;

  return (
    <div className="flex h-full flex-col bg-cream">
      <header className="shrink-0 border-b-2 border-ink px-6 pt-5 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <BriefcaseIcon size={20} weight="bold" className="text-yellow-deep" />
          <h1 className="text-[18px] font-extrabold text-ink">岗位库</h1>
          {state.mode && (
            <span className="font-mono text-[12px] text-mute">
              {MODE_HINT[state.mode]}
              {applied ? ` · 已应用 ${applied} 个筛选` : ''}
            </span>
          )}
        </div>
        <JobSearchBar
          initial={state.query}
          busy={state.status === 'loading'}
          onSearch={(query) => void search(query)}
        />
      </header>
      <div className="flex min-h-0 flex-1">
        <section className="w-[380px] shrink-0 overflow-y-auto border-r-2 border-rule p-4" aria-label="搜索结果">
          <JobResultList
            state={state}
            onSelect={select}
            onLoadMore={handleLoadMore}
            onRetry={() => void search(state.query)}
          />
        </section>
        <section className="min-w-0 flex-1 p-5" aria-label="岗位详情">
          <JobDetailPanel item={selected} />
        </section>
      </div>
    </div>
  );
}
