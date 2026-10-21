'use client';

import { formatCents } from '@muicv/shared';
import { useEffect, useRef, useState } from 'react';

import { ConfirmDialog, type ConfirmDialogHandle } from '@/components/confirm-dialog';

type Status = {
  linked: boolean;
  email?: string | null;
  linkedAt?: string;
  defaultModel?: string;
  scope?: string | null;
  currency?: string;
  balanceCents?: number;
  lifetimeToppedUpCents?: number | null;
  lifetimeSpentCents?: number | null;
  balanceUpdatedAt?: string;
  lastError?: string;
};

type Model = { id: string; label: string; hint?: string };

// SSR 安全的硬格式化（避免 toLocaleString 在 server 与 client 输出不一致导致 hydration mismatch）。
function formatDate(input: string | undefined): string {
  if (!input) return '—';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled authorization on muirouter, so nothing was linked.',
  'state-expired-or-invalid': 'The authorization link expired. Please click Link again.',
  'state-malformed': 'Authorization data was invalid. Please click Link again.',
  'session-mismatch': 'Your session changed. Sign in again, then link muirouter.',
  'token-exchange-failed': 'Token exchange with muirouter failed. Please try again later.',
  network: 'muirouter network error. Please try again later.',
  'missing-code-or-state': 'The callback is missing required parameters.',
};

function readUrlFlag(): { linked: boolean; error: string | null } {
  if (typeof window === 'undefined') return { linked: false, error: null };
  const params = new URLSearchParams(window.location.search);
  return {
    linked: params.get('linked') === '1',
    error: params.get('error'),
  };
}

function clearUrlFlag() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('linked');
  url.searchParams.delete('error');
  window.history.replaceState(null, '', url.toString());
}

export function MuirouterSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function load() {
    try {
      const [linkRes, modelRes] = await Promise.all([fetch('/api/muirouter'), fetch('/api/muirouter/model')]);
      if (!linkRes.ok) throw new Error(`HTTP ${linkRes.status}`);
      const data = (await linkRes.json()) as Status;
      setStatus(data);
      if (modelRes.ok) {
        const modelData = (await modelRes.json()) as { models: Model[] };
        setModels(modelData.models ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }

  useEffect(() => {
    const flag = readUrlFlag();
    if (flag.linked) {
      setInfo('muirouter linked successfully.');
      clearUrlFlag();
    } else if (flag.error) {
      setError(ERROR_MESSAGES[flag.error] ?? `Linking failed: ${flag.error}`);
      clearUrlFlag();
    }
    load();
  }, []);

  async function onRefresh() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/muirouter/refresh', { method: 'POST' });
      const body = (await res.json()) as { status?: string; message?: string };
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    const ok = await confirmRef.current?.open({
      title: 'Unlink muirouter?',
      message:
        'When your MuiCV balance runs out, calls will no longer fall back to muirouter. The authorization on muirouter will also be revoked.',
      confirmLabel: 'Unlink',
      cancelLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/muirouter', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink');
    } finally {
      setBusy(false);
    }
  }

  async function onChangeModel(model: string) {
    if (!status?.linked) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/muirouter/model', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      const body = (await res.json()) as { error?: string; defaultModel?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      const next = body.defaultModel ?? model;
      setStatus((s) => (s ? { ...s, defaultModel: next } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch model');
    } finally {
      setBusy(false);
    }
  }

  if (status === null && !error && !info) {
    return <PlaceholderCard>Loading…</PlaceholderCard>;
  }

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— muirouter</p>
          <h2 className="mt-2 text-[18px] font-extrabold text-ink">
            Link muirouter to fall back to your own LLM balance when tokens run out
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Your MuiCV balance is used first; when it runs out, calls switch to your linked{' '}
            <a
              href="https://muirouter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
            >
              muirouter
            </a>{' '}
            account and its balance. Authorization happens entirely on muirouter; MuiCV only stores the access token
            (AES-GCM encrypted).
          </p>
        </div>
      </header>

      {info && (
        <div
          role="status"
          className="mt-4 rounded-lg border-2 border-corgi/60 bg-fluff px-3 py-2 text-[14px] font-medium text-yellow-deep"
        >
          {info}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[14px] font-medium text-tongue"
        >
          {error}
        </div>
      )}

      {status?.linked ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border-2 border-corgi/60 bg-fluff p-5 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="font-mono text-[12px] uppercase tracking-wider text-yellow-deep">muirouter balance</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-ink tabular-nums">
                {formatCents(status.balanceCents, status.currency)}
              </div>
              <div className="mt-1 font-mono text-[12px] text-mute">
                Last updated:{formatDate(status.balanceUpdatedAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-1 sm:text-right">
              <Stat
                label="Total topped up"
                value={formatCents(status.lifetimeToppedUpCents ?? null, status.currency)}
              />
              <Stat label="Total spent" value={formatCents(status.lifetimeSpentCents ?? null, status.currency)} />
            </div>
          </div>

          {status.lastError && (
            <div className="rounded-lg border-2 border-amber/70 bg-amber-soft px-3 py-2 text-[12px] text-yellow-deep">
              ⚠ Last sync failed:{status.lastError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-[12px] font-bold text-ink">Default model</span>
              <select
                value={status.defaultModel ?? 'mimo'}
                onChange={(e) => onChangeModel(e.target.value)}
                disabled={busy}
                className="mt-1 block w-full rounded-lg border-2 border-rule-strong bg-cream px-3 py-2 text-[14px] text-ink focus:border-ink focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 disabled:opacity-60"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.hint ? ` (${m.hint})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end gap-1 text-[12px]">
              <span className="font-mono text-[12px] uppercase tracking-wider text-mute">Linked account</span>
              <span className="text-ink">{status.email ?? '—'}</span>
              <span className="font-mono text-[12px] text-mute">Linked on {formatDate(status.linkedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-3 py-1.5 text-[12px] font-bold text-ink disabled:opacity-60"
            >
              {busy ? 'Syncing…' : 'Refresh balance'}
            </button>
            <button
              type="button"
              onClick={() => void onUnlink()}
              disabled={busy}
              className="rounded-lg border-2 border-tongue/60 px-3 py-1.5 text-[12px] font-bold text-tongue transition hover:bg-tongue hover:text-[#fdfaf2] disabled:opacity-60"
            >
              Unlink
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-rule-strong bg-paper p-5">
          <p className="text-[14px] text-ink-soft">
            muirouter is not linked yet. Click the button below, sign in or sign up on muirouter and authorize MuiCV —
            no keys to copy.
          </p>
          <a
            href="/api/muirouter/oauth/start"
            className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-4 py-2 text-[14px] font-bold text-ink"
          >
            Link muirouter
          </a>
        </div>
      )}

      <ConfirmDialog ref={confirmRef} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[12px] uppercase tracking-wider text-mute">{label}</div>
      <div className="mt-0.5 font-mono text-[14px] font-bold text-ink tabular-nums">{value}</div>
    </div>
  );
}

function PlaceholderCard({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border-2 border-rule bg-paper p-6 text-[14px] text-mute">{children}</section>;
}
