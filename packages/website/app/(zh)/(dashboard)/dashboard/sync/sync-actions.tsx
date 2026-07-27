'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { ConfirmDialog, type ConfirmDialogHandle, type ConfirmDialogOpenOptions } from '@/components/confirm-dialog';
import { Spinner } from '@/components/spinner';

type ActionType = 'wipe' | 'restore' | 'delete-history';

export function WipeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function onClick() {
    if (pending) return;
    const ok = await confirmRef.current?.open({
      title: '清空云端备份？',
      message: '活动版和全部历史快照都会被删除，此操作不可逆。本地文件不受影响。',
      confirmLabel: '清空',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      setError(null);
      const res = await fetch('/api/resume/sync', { method: 'DELETE' });
      if (!res.ok) {
        setError(`清空失败：${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-4 py-2 text-[14px] font-bold text-ink shadow-[0_3px_0_0_var(--color-ink-line)] transition active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--color-ink-line)] disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? '清空中…' : '清空云端'}
      </button>
      {error && <p className="mt-2 text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}

export function HistoryRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyAction, setBusyAction] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function call(
    action: ActionType,
    url: string,
    method: 'POST' | 'DELETE',
    confirmOpts: ConfirmDialogOpenOptions,
  ) {
    if (pending) return;
    const ok = await confirmRef.current?.open(confirmOpts);
    if (!ok) return;
    setBusyAction(action);
    start(async () => {
      setError(null);
      const res = await fetch(url, { method });
      setBusyAction(null);
      if (!res.ok) {
        setError(`${action === 'restore' ? '恢复' : '删除'}失败：${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={`flex flex-col items-end gap-1 transition-opacity ${pending ? 'opacity-50' : ''}`}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            void call('restore', `/api/resume/sync/history/${id}/restore`, 'POST', {
              title: '恢复这份历史快照？',
              message: '当前活动版会被自动归档到历史。',
              confirmLabel: '恢复',
            })
          }
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-ink bg-fluff px-2.5 py-1 text-[12px] font-bold text-ink transition hover:bg-corgi disabled:cursor-not-allowed"
        >
          {busyAction === 'restore' ? <Spinner /> : '恢复'}
        </button>
        <button
          type="button"
          onClick={() =>
            void call('delete-history', `/api/resume/sync/history/${id}`, 'DELETE', {
              title: '删除这份历史快照？',
              message: '此操作不可逆。',
              confirmLabel: '删除',
              danger: true,
            })
          }
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-not-allowed"
        >
          {busyAction === 'delete-history' ? <Spinner /> : '删除'}
        </button>
      </div>
      {error && <p className="text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}

export function BlobWipeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function onClick() {
    if (pending) return;
    const ok = await confirmRef.current?.open({
      title: '清空加密版云端备份？',
      message: '加密路径的活动版和全部历史快照（含 R2 密文文件）都会被删除，不可逆。本地文件不受影响。',
      confirmLabel: '清空',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      setError(null);
      const res = await fetch('/api/resume/sync/blob', { method: 'DELETE' });
      if (!res.ok) {
        setError(`清空失败：${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-paper px-4 py-2 text-[14px] font-bold text-ink shadow-[0_3px_0_0_var(--color-ink-line)] transition active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--color-ink-line)] disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? '清空中…' : '清空加密版'}
      </button>
      {error && <p className="mt-2 text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}

export function BlobHistoryRowActions({ id, blobId }: { id: string; blobId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyAction, setBusyAction] = useState<ActionType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function onDelete() {
    if (pending) return;
    const ok = await confirmRef.current?.open({
      title: '删除这份加密历史快照？',
      message: '密文文件（R2）和元数据都会一起删除，此操作不可逆。',
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;
    setBusyAction('delete-history');
    start(async () => {
      setError(null);
      const res = await fetch(`/api/resume/sync/blob/history/${id}`, { method: 'DELETE' });
      setBusyAction(null);
      if (!res.ok) {
        setError(`删除失败：${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={`flex flex-col items-end gap-1 transition-opacity ${pending ? 'opacity-50' : ''}`}>
      <div className="flex gap-2">
        <a
          href={`/api/resume/sync/blob/${blobId}/download`}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-ink bg-fluff px-2.5 py-1 text-[12px] font-bold text-ink transition hover:bg-corgi"
        >
          下载
        </a>
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-not-allowed"
        >
          {busyAction === 'delete-history' ? <Spinner /> : '删除'}
        </button>
      </div>
      {error && <p className="text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
