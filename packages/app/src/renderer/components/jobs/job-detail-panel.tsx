import { describeRestrictions, type JobListing } from '@muicv/shared';
import { ArrowSquareOutIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { friendlyImportError, splitListingId } from '../../lib/job-search-state';
import { toast } from '../../lib/toast';
import { MarkdownView } from '../markdown-view';
import { CATEGORY_LABEL, KIND_LABEL, SOURCE_LABEL, WORKPLACE_LABEL } from './labels';

type DetailState = { status: 'loading' } | { status: 'done'; markdown: string } | { status: 'error'; error: string };

/** 右侧详情：拉完整 JD，提供「导入到档案」与「去原站投递」。 */
export function JobDetailPanel({ item }: { item: JobListing | null }) {
  const [detail, setDetail] = useState<DetailState>({ status: 'loading' });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setDetail({ status: 'loading' });
    const { kind, refId } = splitListingId(item);
    void window.muicv.jobs.detail(kind, refId).then((res) => {
      if (cancelled) return;
      setDetail(res.ok ? { status: 'done', markdown: res.markdown } : { status: 'error', error: res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-[14px] text-mute">在左侧选一个岗位查看详情</div>
    );
  }

  async function handleImport() {
    if (!item) return;
    setImporting(true);
    const { kind, refId } = splitListingId(item);
    const res = await window.muicv.jobs.import(kind, refId);
    setImporting(false);
    if (res.ok) toast.success(`已存到 ${res.targetPath}，正在评估匹配度`, '已导入');
    else toast.error(friendlyImportError(res.error));
  }

  function handleOpen() {
    if (item) void window.muicv.shell.openExternal(item.url);
  }

  const tags = [
    KIND_LABEL[item.kind],
    WORKPLACE_LABEL[item.workplace],
    describeRestrictions(item) || null,
    item.category ? CATEGORY_LABEL[item.category] : null,
  ].filter((t): t is string => Boolean(t));
  const sourceLabel = SOURCE_LABEL[item.source] ?? item.source;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b-2 border-rule pb-3">
        <h2 className="text-[20px] font-extrabold leading-tight text-ink">{item.title}</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          {item.company}
          {item.location ? ` · ${item.location}` : ''} · {item.postedAt.slice(0, 10)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-fluff px-2 py-0.5 text-[12px] text-ink-soft">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="press inline-flex items-center gap-1.5 rounded-md bg-yellow px-3 py-1.5 text-[14px] font-bold text-ink disabled:opacity-60"
          >
            <DownloadSimpleIcon size={16} weight="bold" />
            {importing ? '导入中…' : '导入到档案'}
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-cream px-3 py-1.5 text-[14px] font-bold text-ink"
          >
            <ArrowSquareOutIcon size={16} weight="bold" />去 {item.kind === 'community' ? '原帖' : sourceLabel} 投递
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pt-3 text-[14px]">
        {detail.status === 'loading' && <p className="text-mute">加载详情…</p>}
        {detail.status === 'error' && <p className="text-danger">详情加载失败：{detail.error}</p>}
        {detail.status === 'done' && <MarkdownView source={detail.markdown} />}
        {item.kind === 'collected' && (
          <p className="mt-6 text-[12px] text-mute">via {sourceLabel} · 由 Mui简历自动收集，以原帖为准</p>
        )}
      </div>
    </div>
  );
}
