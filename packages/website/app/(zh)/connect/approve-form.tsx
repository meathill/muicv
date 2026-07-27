'use client';

import { useState } from 'react';

/**
 * 客户端：点"授权"调 POST /api/connect/approve 拿回跳 URL，用 location.href 触发
 * muicv:// scheme，让 OS 唤起 electron app。备用登录码只放在故障排查入口里。
 */
export function ApproveForm({ state, redirect, appName }: { state: string; redirect: string; appName: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ key: string; redirectUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onApprove() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/connect/approve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, redirect, name: `桌面端 ${appName}` }),
      });
      const data = (await res.json()) as { redirectUrl: string; key: string } | { error: string; detail?: string };
      if (!res.ok || !('redirectUrl' in data)) {
        throw new Error('detail' in data && data.detail ? data.detail : 'error' in data ? data.error : '授权失败');
      }
      setDone({ key: data.key, redirectUrl: data.redirectUrl });
      // 主动触发 deep link
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 space-y-4">
        <div
          aria-live="polite"
          className="rounded-xl border border-rule bg-fluff px-4 py-3 text-[14px] leading-[1.65] text-ink"
        >
          <p className="text-[16px] font-extrabold">已连接</p>
          <p className="mt-1 text-ink-soft">如果桌面 app 已经打开，可以直接回去继续。没反应的话，再点一次。</p>
        </div>
        <a
          href={done.redirectUrl}
          className="press inline-flex w-full items-center justify-center rounded-lg bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink"
        >
          打开桌面 app
        </a>
        <details className="rounded-lg border border-rule bg-paper/70 px-4 py-3 text-[12px] text-ink-soft">
          <summary className="cursor-pointer font-bold text-ink">桌面 app 没反应？</summary>
          <div className="mt-3 space-y-3">
            <p className="leading-[1.6] text-mute">
              少数浏览器会拦截自动打开。复制备用登录码，回到桌面 app 的手动登录里粘贴。
            </p>
            <button
              type="button"
              onClick={() => {
                setCopied(true);
                void navigator.clipboard.writeText(done.key);
              }}
              className="block w-full rounded-lg border-2 border-rule-strong bg-cream px-4 py-2 text-[14px] font-bold text-ink hover:bg-fluff"
            >
              {copied ? '已复制备用登录码' : '复制备用登录码'}
            </button>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[14px] font-medium text-tongue"
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={() => void onApprove()}
        disabled={busy}
        className="press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow px-4 py-2.5 text-[16px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? '正在连接…' : '连接并打开桌面 app'}
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="block w-full text-center text-[12px] text-mute hover:text-ink"
      >
        取消连接
      </button>
    </div>
  );
}
