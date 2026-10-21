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
      title: 'Wipe the cloud backup?',
      message:
        'The current version and all history snapshots will be deleted. This cannot be undone. Local files are not affected.',
      confirmLabel: 'Wipe',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      setError(null);
      const res = await fetch('/api/resume/sync', { method: 'DELETE' });
      if (!res.ok) {
        setError(`Wipe failed: ${res.status}`);
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
        {pending ? 'Wiping…' : 'Wipe cloud'}
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
        setError(`${action === 'restore' ? 'Restore' : 'Delete'} failed: ${res.status}`);
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
              title: 'Restore this snapshot?',
              message: 'The current version will be archived to history automatically.',
              confirmLabel: 'Restore',
              cancelLabel: 'Cancel',
            })
          }
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-ink bg-fluff px-2.5 py-1 text-[12px] font-bold text-ink transition hover:bg-corgi disabled:cursor-not-allowed"
        >
          {busyAction === 'restore' ? <Spinner /> : 'Restore'}
        </button>
        <button
          type="button"
          onClick={() =>
            void call('delete-history', `/api/resume/sync/history/${id}`, 'DELETE', {
              title: 'Delete this snapshot?',
              message: 'This cannot be undone.',
              confirmLabel: 'Delete',
              cancelLabel: 'Cancel',
              danger: true,
            })
          }
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-not-allowed"
        >
          {busyAction === 'delete-history' ? <Spinner /> : 'Delete'}
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
      title: 'Wipe the encrypted cloud backup?',
      message:
        'The encrypted current version and all history snapshots (including R2 ciphertext files) will be deleted. This cannot be undone. Local files are not affected.',
      confirmLabel: 'Wipe',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      setError(null);
      const res = await fetch('/api/resume/sync/blob', { method: 'DELETE' });
      if (!res.ok) {
        setError(`Wipe failed: ${res.status}`);
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
        {pending ? 'Wiping…' : 'Wipe encrypted'}
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
      title: 'Delete this encrypted snapshot?',
      message: 'The ciphertext file (R2) and its metadata will be deleted. This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    setBusyAction('delete-history');
    start(async () => {
      setError(null);
      const res = await fetch(`/api/resume/sync/blob/history/${id}`, { method: 'DELETE' });
      setBusyAction(null);
      if (!res.ok) {
        setError(`Delete failed: ${res.status}`);
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
          Download
        </a>
        <button
          type="button"
          onClick={() => void onDelete()}
          disabled={pending}
          className="inline-flex min-w-[56px] items-center justify-center rounded-lg border border-rule bg-paper px-2.5 py-1 text-[12px] font-bold text-ink-soft transition hover:border-ink hover:text-ink disabled:cursor-not-allowed"
        >
          {busyAction === 'delete-history' ? <Spinner /> : 'Delete'}
        </button>
      </div>
      {error && <p className="text-[12px] text-tongue">{error}</p>}
      <ConfirmDialog ref={confirmRef} />
    </div>
  );
}
