import { filterTagLabel, type JobFilterKey } from '@muicv/shared';
import { BriefcaseIcon, SparkleIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';

import { activeFilterTags, removeFilter } from '../lib/job-search-state';
import { useJobSearch } from '../lib/use-job-search';
import { JobDetailPanel } from './jobs/job-detail-panel';
import { JobResultList } from './jobs/job-result-list';
import { JobSearchBar } from './jobs/job-search-bar';

const MODE_HINT = {
  hybrid: '关键词 + 语义混合匹配',
  keyword: '关键词匹配（语义搜索暂不可用）',
  latest: '最新岗位',
} as const;

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
  const tags = activeFilterTags(state.appliedFilters, state.detected);
  // 删标签后 query 由外部改写，换 key 让搜索栏用新 query 重新初始化
  const [barRevision, setBarRevision] = useState(0);

  function handleRemoveTag(key: JobFilterKey) {
    setBarRevision((n) => n + 1);
    void search(removeFilter(state.query, state.detected, key));
  }

  return (
    <div className="flex h-full flex-col bg-cream">
      <header className="shrink-0 border-b-2 border-ink px-6 pt-5 pb-4">
        <div className="mb-3 flex items-center gap-2">
          <BriefcaseIcon size={20} weight="bold" className="text-yellow-deep" />
          <h1 className="text-[18px] font-extrabold text-ink">岗位库</h1>
          {state.mode && <span className="font-mono text-[12px] text-mute">{MODE_HINT[state.mode]}</span>}
        </div>
        <JobSearchBar
          key={barRevision}
          initial={state.query}
          busy={state.status === 'loading'}
          onSearch={(query) => void search(query)}
        />
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="生效中的筛选">
            <span className="text-[12px] text-mute">生效筛选：</span>
            {tags.map((tag) => (
              <span
                key={tag.key}
                className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-fluff px-2 py-0.5 text-[12px] text-ink"
                title={tag.detected ? '从你的描述中自动识别' : '手动选择'}
              >
                {tag.detected && <SparkleIcon size={12} weight="fill" className="text-yellow-deep" />}
                {filterTagLabel(tag.key, tag.value as never)}
                <button
                  type="button"
                  aria-label={`移除筛选 ${filterTagLabel(tag.key, tag.value as never)}`}
                  onClick={() => handleRemoveTag(tag.key)}
                  className="rounded-full p-0.5 hover:bg-yellow"
                >
                  <XIcon size={12} weight="bold" />
                </button>
              </span>
            ))}
          </div>
        )}
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
