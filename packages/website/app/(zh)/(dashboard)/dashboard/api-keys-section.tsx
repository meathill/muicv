'use client';

import { useEffect, useRef, useState } from 'react';

import { ConfirmDialog, type ConfirmDialogHandle } from '@/components/confirm-dialog';
import { Spinner } from '@/components/spinner';

type KeyRow = {
  id: string;
  name: string;
  keyPreview: string;
  lastUsedAt: number | null;
  createdAt: number | string;
};

type CreatedKey = {
  id: string;
  name: string;
  key: string; // 原文，仅创建时显示一次
  keyPreview: string;
  createdAt: string;
};

export function ApiKeysSection() {
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);
  /** 正在删除的 key id 集合——支持连续点多个，每行各自显示 spinner，互不阻塞。 */
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function load() {
    try {
      const res = await fetch('/api/keys');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { keys: KeyRow[] };
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || undefined }),
      });
      const body = (await res.json()) as Partial<CreatedKey> & { error?: string; detail?: string };
      if (!res.ok) {
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      if (body.id && body.name && body.key && body.keyPreview && body.createdAt) {
        setRevealedKey({
          id: body.id,
          name: body.name,
          key: body.key,
          keyPreview: body.keyPreview,
          createdAt: body.createdAt,
        });
      }
      setNewKeyName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    if (deletingIds.has(id)) return;
    const ok = await confirmRef.current?.open({
      title: '撤销这个凭证？',
      message: '已经在用它的技能 / 桌面应用会立刻失效。',
      confirmLabel: '撤销',
      danger: true,
    });
    if (!ok) return;
    setError(null);
    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤销失败');
    } finally {
      setDeletingIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function copyKey() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— API Keys</p>
          <h2 className="mt-2 text-[18px] font-extrabold text-ink">给桌面应用 / 技能用的登录钥匙</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            <strong>桌面应用的唯一登录凭证</strong>。创建后仅显示一次： 桌面应用 → 设置 → 粘进来；或在技能里设到{' '}
            <code className="rounded bg-fluff px-1 font-mono text-[12px]">MUICV_API_KEY</code> 环境变量。最多 10
            个有效凭证。
          </p>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[14px] font-medium text-tongue"
        >
          {error}
        </div>
      )}

      {/* 创建新 key */}
      <form onSubmit={onCreate} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="block text-[12px] font-bold text-ink">名字（可选）</span>
          <input
            type="text"
            maxLength={64}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            disabled={creating}
            placeholder="例如：MacBook · 笔电 · 工作机"
            className="mt-1 block w-full rounded-lg border-2 border-rule-strong bg-cream px-3 py-2 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-4 py-2 text-[14px] font-bold text-ink disabled:opacity-60"
        >
          {creating ? '生成中…' : '生成新凭证'}
        </button>
      </form>

      {/* Reveal 弹层（受控显示） */}
      {revealedKey && (
        <div className="mt-5 rounded-xl border-2 border-yellow-deep bg-fluff p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-bold text-ink">⚠️ 复制保存——关掉就再也看不到了</p>
              <p className="mt-1 text-[12px] text-ink-soft">
                建议立刻设到终端配置：
                <code className="rounded bg-cream px-1 font-mono text-[12px]">export MUICV_API_KEY=…</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="rounded px-2 py-1 text-[12px] font-semibold text-ink-soft hover:bg-cream hover:text-ink"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 break-all rounded-lg bg-[#1a1815] px-3 py-2 font-mono text-[14px] text-corgi">
              {revealedKey.key}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="press-ink inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-cream px-3 py-2 text-[12px] font-bold text-ink"
            >
              {copied ? '✓ 已复制' : '复制'}
            </button>
          </div>
        </div>
      )}

      {/* Key 列表 */}
      <div className="mt-6">
        {keys === null ? (
          <p className="text-[14px] text-mute">加载中…</p>
        ) : keys.length === 0 ? (
          <p className="text-[14px] text-mute">还没有凭证。点上面"生成新凭证"创建第一把。</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => {
              const deleting = deletingIds.has(k.id);
              return (
                <li
                  key={k.id}
                  className={`flex flex-col items-start gap-2 rounded-lg border-2 border-rule bg-paper px-4 py-3 transition-opacity sm:flex-row sm:items-center sm:gap-4 ${deleting ? 'opacity-50' : ''}`}
                  aria-busy={deleting}
                >
                  <div className="flex-1">
                    <div className="text-[14px] font-bold text-ink">{k.name}</div>
                    <div className="mt-0.5 font-mono text-[12px] text-mute">{k.keyPreview}</div>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-mute">
                    <span title={`创建于 ${formatDate(k.createdAt)}`}>建于 {formatDate(k.createdAt)}</span>
                    <span>·</span>
                    <span>最后使用：{k.lastUsedAt ? formatDate(k.lastUsedAt) : '从未'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevoke(k.id)}
                    disabled={deleting}
                    className="inline-flex min-w-[64px] items-center justify-center rounded-md border-2 border-tongue/60 px-3 py-1 text-[12px] font-bold text-tongue transition hover:bg-tongue hover:text-[#fdfaf2] disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-tongue"
                  >
                    {deleting ? <Spinner /> : '撤销'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog ref={confirmRef} />
    </section>
  );
}

function formatDate(input: number | string): string {
  const d = typeof input === 'number' ? new Date(input) : new Date(input);
  if (Number.isNaN(d.getTime())) return '—';
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
