'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { ConfirmDialog, type ConfirmDialogHandle } from '@/components/confirm-dialog';
import { Spinner } from '@/components/spinner';

import type { PhotoUploadItem, PreviewListItem } from '@/lib/preview';

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const TEMPLATE_LABELS: Record<string, string> = {
  't1-classic': '经典商务',
  't2-minimal': '现代极简',
  't3-sidebar': '双栏侧边',
  't4-tech': '技术工程',
  't5-timeline': '时间线',
  't6-academic': '学术 CV',
};

export function PreviewList({ items }: { items: PreviewListItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— 还没有预览</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">来创建第一个分享链接</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          在桌面 app 的 version 详情里点「在线预览」，或者跟 muicv-render skill 说"生成预览链接"。
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      {items.map((item) => (
        <PreviewRow key={item.token} item={item} />
      ))}
    </section>
  );
}

function PreviewRow({ item }: { item: PreviewListItem }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <article
      className={`rounded-xl border-2 p-5 ${
        item.status === 'active'
          ? 'border-ink bg-cream shadow-[0_3px_0_0_var(--color-ink-line)]'
          : 'border-rule bg-paper opacity-80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-fluff px-2 py-0.5 font-mono text-[12px] font-bold text-yellow-deep">
              {TEMPLATE_LABELS[item.template] ?? item.template}
            </span>
            <span className="font-mono text-[12px] uppercase tracking-wider text-mute">{item.lang}</span>
            <StatusBadge status={item.status} />
            <ShareBadge shareMode={item.shareMode} />
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all font-mono text-[12px] text-ink underline decoration-rule-strong underline-offset-2"
          >
            {item.url}
          </a>
          <p className="mt-2 text-[12px] text-mute">
            创建于 {formatTimestamp(item.createdAt)} · 过期 {formatTimestamp(item.expiresAt)}
            {item.pdfCredit === 0 ? <span className="ml-2 text-tongue">· PDF 未预热</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink"
          >
            {copied ? '已复制' : '复制链接'}
          </button>
        </div>
      </div>
      {item.status === 'active' ? <ActiveActions item={item} /> : <InactiveActions item={item} />}
    </article>
  );
}

function StatusBadge({ status }: { status: PreviewListItem['status'] }) {
  const map: Record<PreviewListItem['status'], { label: string; className: string }> = {
    active: { label: '生效中', className: 'bg-corgi/30 text-ink' },
    expired: { label: '已过期', className: 'bg-rule text-ink-soft' },
    revoked: { label: '已撤销', className: 'bg-tongue/20 text-tongue' },
  };
  const { label, className } = map[status];
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[12px] uppercase tracking-wider ${className}`}>{label}</span>
  );
}

function ShareBadge({ shareMode }: { shareMode: PreviewListItem['shareMode'] }) {
  return (
    <span className="rounded border-[1.5px] border-rule px-2 py-0.5 font-mono text-[12px] uppercase tracking-wider text-mute">
      {shareMode === 'public' ? 'public' : 'link only'}
    </span>
  );
}

function ActiveActions({ item }: { item: PreviewListItem }) {
  const router = useRouter();
  const confirmRef = useRef<ConfirmDialogHandle>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<'revoke' | 'extend-7' | 'extend-30' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, init: RequestInit, onOk: () => void, key: typeof busy) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(path, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onOk();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke() {
    const ok = await confirmRef.current?.open({
      title: '撤销分享链接？',
      message: '撤销后访客打开链接会看到"已撤销"提示。可以稍后续期重新启用。',
      confirmLabel: '撤销',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      await call(`/api/previews/${item.token}`, { method: 'DELETE' }, () => {}, 'revoke');
    });
  }

  function onExtend(days: 7 | 30) {
    start(async () => {
      await call(
        `/api/previews/${item.token}/extend`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ttlDays: days }),
        },
        () => {},
        days === 7 ? 'extend-7' : 'extend-30',
      );
    });
  }

  function onShareModeFlip() {
    const next = item.shareMode === 'public' ? 'link' : 'public';
    start(async () => {
      await call(
        `/api/previews/${item.token}/share-mode`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ shareMode: next }),
        },
        () => {},
        'share',
      );
    });
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t-2 border-rule pt-3">
      <button
        type="button"
        onClick={() => onExtend(7)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {busy === 'extend-7' && <Spinner />}续 7 天
      </button>
      <button
        type="button"
        onClick={() => onExtend(30)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {busy === 'extend-30' && <Spinner />}续 30 天
      </button>
      <button
        type="button"
        onClick={onShareModeFlip}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {busy === 'share' && <Spinner />}
        改为 {item.shareMode === 'public' ? 'link only' : 'public'}
      </button>
      <button
        type="button"
        onClick={() => void onRevoke()}
        disabled={pending}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-tongue bg-paper px-3 py-1.5 text-[12px] font-bold text-tongue transition hover:bg-tongue/10 disabled:opacity-60"
      >
        {busy === 'revoke' && <Spinner />}
        撤销
      </button>
      {error && <p className="basis-full text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}

function InactiveActions({ item }: { item: PreviewListItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function reactivate(days: 7 | 30) {
    start(async () => {
      setError(null);
      const res = await fetch(`/api/previews/${item.token}/extend`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ttlDays: days }),
      });
      if (!res.ok) {
        setError(`重新启用失败：${res.status}`);
        return;
      }
      router.refresh();
    });
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-rule pt-3">
      <span className="text-[12px] text-mute">需要重新分享？</span>
      <button
        type="button"
        onClick={() => reactivate(7)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {pending && <Spinner />}
        重新启用 7 天
      </button>
      {error && <span className="text-[12px] text-tongue">{error}</span>}
    </div>
  );
}

export function PhotoHistoryList({ items }: { items: PhotoUploadItem[] }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  if (items.length === 0) {
    return <p className="mt-4 text-[14px] text-mute">还没上传过照片。下次在桌面 app 编辑简历时选「上传照片」即可。</p>;
  }
  async function copy(url: string, key: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  }
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <li key={p.id} className="flex items-start gap-3 rounded-xl border-2 border-rule bg-cream p-3">
          {/* biome-ignore lint/performance/noImgElement: 这里就是要展示 R2 外链的预览图，next/image 跟 R2 自定义域签名/loader 配置代价不值 */}
          <img
            src={p.url}
            alt={p.originalName ?? '证件照'}
            width={200}
            height={266}
            loading="lazy"
            decoding="async"
            className="h-20 w-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink">{p.originalName ?? '(未命名)'}</p>
            <p className="font-mono text-[12px] text-mute">
              {formatSize(p.sizeBytes)} · {p.contentType.replace('image/', '')}
            </p>
            <p className="mt-1 text-[12px] text-mute">{formatTimestamp(p.createdAt)}</p>
            <button
              type="button"
              onClick={() => void copy(p.url, p.r2Key)}
              className="mt-2 rounded border-2 border-rule bg-paper px-2 py-1 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink"
            >
              {copiedKey === p.r2Key ? '已复制 URL' : '复制 URL'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
