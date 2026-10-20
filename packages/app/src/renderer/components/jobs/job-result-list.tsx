import type { JobListing } from '@muicv/shared';
import { useEffect, useRef } from 'react';

import type { JobSearchState } from '../../lib/job-search-state';
import { REMOTE_LABEL, SOURCE_LABEL } from './labels';

type Props = {
  state: JobSearchState;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
};

function JobRow({ item, active, onSelect }: { item: JobListing; active: boolean; onSelect: () => void }) {
  const source = item.kind === 'community' ? '社区' : `via ${SOURCE_LABEL[item.source] ?? item.source}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full rounded-md border-2 px-3 py-2 text-left transition ${
        active ? 'border-ink bg-fluff shadow-[0_2px_0_0_var(--color-ink)]' : 'border-rule bg-cream hover:border-ink'
      }`}
    >
      <p className="truncate font-mono text-[12px] text-yellow-deep">
        {[source, item.location, item.remote ? REMOTE_LABEL[item.remote] : ''].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-0.5 truncate text-[14px] font-bold text-ink">{item.title}</p>
      <p className="truncate text-[12px] text-ink-soft">
        {item.company} · {item.postedAt.slice(0, 10)}
      </p>
    </button>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border-2 border-dashed border-rule bg-paper px-4 py-8 text-center text-[14px] text-ink-soft">
      {children}
    </div>
  );
}

/** 结果列表：滚到底部自动加载下一页（IntersectionObserver）。 */
export function JobResultList({ state, onSelect, onLoadMore, onRetry }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !state.hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) onLoadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.hasMore, onLoadMore]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className="h-[68px] animate-pulse rounded-md bg-paper" />
        ))}
      </div>
    );
  }
  if (state.status === 'error' && state.items.length === 0) {
    return (
      <Placeholder>
        <p className="text-danger">{state.error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-md border-2 border-ink px-3 py-1 font-bold">
          重试
        </button>
      </Placeholder>
    );
  }
  if (state.status === 'done' && state.items.length === 0) {
    return <Placeholder>没有匹配的岗位，换个说法或放宽筛选试试。</Placeholder>;
  }

  return (
    <div className="space-y-2">
      {state.items.map((item) => (
        <JobRow key={item.id} item={item} active={item.id === state.selectedId} onSelect={() => onSelect(item.id)} />
      ))}
      <div ref={sentinel} />
      {state.status === 'loading-more' && <p className="py-2 text-center text-[12px] text-mute">加载中…</p>}
      {state.status === 'error' && <p className="py-2 text-center text-[12px] text-danger">{state.error}</p>}
      {state.status === 'done' && !state.hasMore && state.items.length > 0 && (
        <p className="py-2 text-center text-[12px] text-mute">没有更多了</p>
      )}
    </div>
  );
}
