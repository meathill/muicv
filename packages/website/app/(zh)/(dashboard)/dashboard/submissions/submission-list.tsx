'use client';

import { useCallback, useEffect, useState } from 'react';

import { Spinner } from '@/components/spinner';
import type { SubmissionPhase, SubmissionView } from '@/lib/job-submission-view';
import type { SubmissionPage } from '@/lib/job-submissions';

const POLL_MS = 5000;

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function signed(n: number): string {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

const PHASE: Record<SubmissionPhase, { label: string; className: string }> = {
  queued: { label: '排队中', className: 'bg-fluff text-yellow-deep' },
  processing: { label: '处理中', className: 'bg-fluff text-yellow-deep' },
  done: { label: '已完成', className: 'bg-corgi/30 text-ink' },
  failed: { label: '失败', className: 'bg-tongue/20 text-tongue' },
};

const JOB_STATUS: Record<string, string> = { new: '新入库', duplicate: '已存在', failed: '入库失败' };

function isPending(item: SubmissionView): boolean {
  return item.phase === 'queued' || item.phase === 'processing';
}

export function SubmissionList({ initial }: { initial: SubmissionPage }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = items.some(isPending);

  // 有排队 / 处理中的提交就定时刷新第一页，合并回列表
  const refresh = useCallback(async () => {
    const res = await fetch('/api/me/submissions', { cache: 'no-store' });
    if (!res.ok) return;
    const page = (await res.json()) as SubmissionPage;
    setItems((prev) => {
      const fresh = new Map(page.items.map((i) => [i.id, i]));
      const merged = prev.map((i) => fresh.get(i.id) ?? i);
      const known = new Set(prev.map((i) => i.id));
      return [...page.items.filter((i) => !known.has(i.id)), ...merged];
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  async function loadMore() {
    if (cursor == null) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetch(`/api/me/submissions?cursor=${cursor}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as SubmissionPage;
      setItems((prev) => {
        const known = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !known.has(i.id))];
      });
      setCursor(page.nextCursor);
    } catch (err) {
      setError(`加载失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— 还没有提交</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">打开任意招聘页，用扩展提交</h2>
        <p className="mt-2 text-[14px] text-ink-soft">提交后这里会显示处理进度和积分变化。</p>
      </section>
    );
  }

  const settled = items.filter((i) => i.phase === 'done' || i.phase === 'failed');
  const totalNet = settled.reduce((sum, i) => sum + i.net, 0);
  const totalNew = settled.reduce((sum, i) => sum + i.created, 0);

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-mute">
        已列出 {items.length} 次提交 · 新入库 {totalNew} 个岗位 · 已结算净变化{' '}
        <span className={`font-mono font-bold ${totalNet >= 0 ? 'text-ink' : 'text-tongue'}`}>{signed(totalNet)}</span>
        {pending ? (
          <span className="ml-2 inline-flex items-center gap-1 text-yellow-deep">
            <Spinner /> 自动刷新中
          </span>
        ) : null}
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <SubmissionRowView key={item.id} item={item} />
        ))}
      </ul>
      {cursor != null ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
        >
          {loadingMore && <Spinner />}
          加载更多
        </button>
      ) : null}
      {error ? <p className="text-[12px] text-tongue">{error}</p> : null}
    </div>
  );
}

function SubmissionRowView({ item }: { item: SubmissionView }) {
  const phase = PHASE[item.phase];
  const pending = isPending(item);
  return (
    <li
      className={`rounded-xl border-2 p-5 ${
        pending ? 'border-ink bg-cream shadow-[0_3px_0_0_var(--color-ink-line)]' : 'border-rule bg-paper'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[12px] uppercase tracking-wider ${phase.className}`}
            >
              {pending && <Spinner />}
              {phase.label}
            </span>
            <span className="rounded border-[1.5px] border-rule px-2 py-0.5 font-mono text-[12px] uppercase tracking-wider text-mute">
              {item.visibility === 'public' ? '公共池' : '私藏'}
            </span>
            <span className="text-[12px] text-mute">{formatTimestamp(item.createdAt)}</span>
          </div>
          <p className="mt-2 text-[14px] font-extrabold text-ink">{item.title}</p>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block break-all font-mono text-[12px] text-ink-soft underline decoration-rule-strong underline-offset-2"
          >
            {item.url}
          </a>
          {!pending ? (
            <p className="mt-2 text-[12px] text-mute">
              识别 {item.found} · 新入库 {item.created} · 重复 {item.duplicates}
              {item.note ? ` · ${item.note}` : ''}
              {item.error && item.phase === 'failed' ? ` · ${item.error}` : ''}
            </p>
          ) : null}
        </div>
        <Credits item={item} />
      </div>
      {item.jobs.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t-2 border-rule pt-3">
          {item.jobs.map((job) => (
            <li key={`${job.url}-${job.title}`} className="flex flex-wrap items-center gap-2 text-[12px]">
              <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-yellow-deep">
                {JOB_STATUS[job.status] ?? job.status}
              </span>
              <span className="font-bold text-ink">{job.title}</span>
              {job.company ? <span className="text-mute">{job.company}</span> : null}
              {job.link ? (
                <a href={job.link} target="_blank" rel="noreferrer" className="font-bold text-ink underline">
                  查看
                </a>
              ) : item.visibility === 'private' ? (
                <span className="text-mute">已存入私藏</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Credits({ item }: { item: SubmissionView }) {
  const pending = isPending(item);
  return (
    <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-right font-mono text-[12px] tabular-nums">
      <dt className="text-mute">预扣</dt>
      <dd className="text-ink-soft">{fmt(item.hold)}</dd>
      {!pending ? (
        <>
          <dt className="text-mute">退还</dt>
          <dd className="text-ink-soft">{fmt(item.refund)}</dd>
          <dt className="text-mute">扣费</dt>
          <dd className="text-ink-soft">{fmt(item.charged)}</dd>
          <dt className="text-mute">奖励</dt>
          <dd className="text-ink-soft">{fmt(item.reward)}</dd>
        </>
      ) : null}
      <dt className="font-bold text-ink">{pending ? '暂扣' : '净变化'}</dt>
      <dd className={`font-extrabold ${item.net >= 0 ? 'text-ink' : 'text-tongue'}`}>{signed(item.net)}</dd>
    </dl>
  );
}
