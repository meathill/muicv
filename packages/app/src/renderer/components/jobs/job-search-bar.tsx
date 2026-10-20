import {
  JOB_CATEGORIES,
  JOB_KINDS,
  JOB_REGIONS,
  type JobCategory,
  type JobKind,
  type JobRegion,
  REMOTE_TYPES,
  type RemoteType,
} from '@muicv/shared';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import type { JobSearchQuery } from '../../lib/job-search-state';
import { CATEGORY_LABEL, KIND_LABEL, REGION_LABEL, REMOTE_LABEL } from './labels';

type QueryPatch = { [K in keyof JobSearchQuery]?: JobSearchQuery[K] | undefined };

type Props = { initial: JobSearchQuery; busy: boolean; onSearch: (query: JobSearchQuery) => void };

function FilterSelect<T extends string>({
  label,
  value,
  values,
  labels,
  onChange,
}: {
  label: string;
  value: T | undefined;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T | undefined) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      className="rounded-md border-2 border-ink bg-cream px-2 py-1.5 text-[12px] text-ink"
    >
      <option value="">{label}：不限</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {labels[v]}
        </option>
      ))}
    </select>
  );
}

/** 顶部：自然语言输入 + 四个结构化过滤。过滤一改就立即重搜。 */
export function JobSearchBar({ initial, busy, onSearch }: Props) {
  const [query, setQuery] = useState<JobSearchQuery>(initial);

  function update(patch: QueryPatch, submit: boolean) {
    const next = { ...query, ...patch } as QueryPatch & { q: string };
    for (const key of ['kind', 'remote', 'region', 'category'] as const) {
      if (next[key] === undefined) delete next[key];
    }
    setQuery(next as JobSearchQuery);
    if (submit) onSearch(next as JobSearchQuery);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(query);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border-2 border-ink bg-cream px-3">
          <MagnifyingGlassIcon size={16} className="shrink-0 text-mute" />
          <input
            value={query.q}
            onChange={(e) => update({ q: e.target.value }, false)}
            placeholder="用一句话描述想要的工作，比如：欧洲远程的资深后端，Go 优先"
            className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-ink outline-none placeholder:text-mute"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="press rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink disabled:opacity-60"
        >
          {busy ? '搜索中…' : '搜索'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect<JobKind>
          label="来源"
          value={query.kind}
          values={JOB_KINDS}
          labels={KIND_LABEL}
          onChange={(kind) => update({ kind }, true)}
        />
        <FilterSelect<RemoteType>
          label="办公"
          value={query.remote}
          values={REMOTE_TYPES}
          labels={REMOTE_LABEL}
          onChange={(remote) => update({ remote }, true)}
        />
        <FilterSelect<JobRegion>
          label="地区"
          value={query.region}
          values={JOB_REGIONS}
          labels={REGION_LABEL}
          onChange={(region) => update({ region }, true)}
        />
        <FilterSelect<JobCategory>
          label="职能"
          value={query.category}
          values={JOB_CATEGORIES}
          labels={CATEGORY_LABEL}
          onChange={(category) => update({ category }, true)}
        />
      </div>
    </form>
  );
}
