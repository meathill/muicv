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
  access_denied: '你在 muirouter 取消了授权，未关联。',
  'state-expired-or-invalid': '授权链接已过期，请重新点关联。',
  'state-malformed': '授权数据异常，请重新点关联。',
  'session-mismatch': '登录状态变了，请重新登录后再关联 muirouter。',
  'token-exchange-failed': '与 muirouter 换取授权失败，请稍后再试。',
  network: 'muirouter 网络异常，请稍后再试。',
  'missing-code-or-state': '回调缺少必要参数。',
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
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }

  useEffect(() => {
    const flag = readUrlFlag();
    if (flag.linked) {
      setInfo('已成功关联 muirouter。');
      clearUrlFlag();
    } else if (flag.error) {
      setError(ERROR_MESSAGES[flag.error] ?? `关联失败：${flag.error}`);
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
      setError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    const ok = await confirmRef.current?.open({
      title: '解除 muirouter 关联？',
      message: 'muicv 平台余额耗尽后将不再自动切到 muirouter。muirouter 端的授权也会一并撤销。',
      confirmLabel: '确认解除',
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
      setError(err instanceof Error ? err.message : '解绑失败');
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
      setError(err instanceof Error ? err.message : '模型切换失败');
    } finally {
      setBusy(false);
    }
  }

  if (status === null && !error && !info) {
    return <PlaceholderCard>加载中…</PlaceholderCard>;
  }

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— muirouter</p>
          <h2 className="mt-2 text-[18px] font-extrabold text-ink">
            关联 muirouter，余额耗尽时自动切到自己的大语言模型余额
          </h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            muicv 平台余额优先扣费；耗尽后自动切到你绑定的{' '}
            <a
              href="https://muirouter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
            >
              muirouter
            </a>{' '}
            走自己的余额。授权全程在 muirouter 完成，muicv 只保管授权令牌（AES-GCM 加密保存）。
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
              <div className="font-mono text-[12px] uppercase tracking-wider text-yellow-deep">muirouter 余额</div>
              <div className="mt-1 font-display text-3xl font-extrabold text-ink tabular-nums">
                {formatCents(status.balanceCents, status.currency)}
              </div>
              <div className="mt-1 font-mono text-[12px] text-mute">
                上次更新：{formatDate(status.balanceUpdatedAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-1 sm:text-right">
              <Stat label="累计充值" value={formatCents(status.lifetimeToppedUpCents ?? null, status.currency)} />
              <Stat label="累计消费" value={formatCents(status.lifetimeSpentCents ?? null, status.currency)} />
            </div>
          </div>

          {status.lastError && (
            <div className="rounded-lg border-2 border-amber/70 bg-amber-soft px-3 py-2 text-[12px] text-yellow-deep">
              ⚠ 上次同步失败：{status.lastError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="block text-[12px] font-bold text-ink">默认模型</span>
              <select
                value={status.defaultModel ?? 'mimo'}
                onChange={(e) => onChangeModel(e.target.value)}
                disabled={busy}
                className="mt-1 block w-full rounded-lg border-2 border-rule-strong bg-cream px-3 py-2 text-[14px] text-ink focus:border-ink focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 disabled:opacity-60"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.hint ? `（${m.hint}）` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col justify-end gap-1 text-[12px]">
              <span className="font-mono text-[12px] uppercase tracking-wider text-mute">关联账号</span>
              <span className="text-ink">{status.email ?? '—'}</span>
              <span className="font-mono text-[12px] text-mute">绑定于 {formatDate(status.linkedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-3 py-1.5 text-[12px] font-bold text-ink disabled:opacity-60"
            >
              {busy ? '同步中…' : '刷新余额'}
            </button>
            <button
              type="button"
              onClick={() => void onUnlink()}
              disabled={busy}
              className="rounded-lg border-2 border-tongue/60 px-3 py-1.5 text-[12px] font-bold text-tongue transition hover:bg-tongue hover:text-[#fdfaf2] disabled:opacity-60"
            >
              解除关联
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border-2 border-dashed border-rule-strong bg-paper p-5">
          <p className="text-[14px] text-ink-soft">
            还没有关联 muirouter。点下面按钮跳到 muirouter，登录或注册后授权 muicv 即可——全程不需要复制密钥。
          </p>
          <a
            href="/api/muirouter/oauth/start"
            className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-4 py-2 text-[14px] font-bold text-ink"
          >
            关联 muirouter
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
