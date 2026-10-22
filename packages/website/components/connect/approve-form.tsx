'use client';

import { useState } from 'react';

import type { ConnectTarget } from '@/lib/connect-redirect';

import { type ConnectLang, connectCopy } from './copy';

/**
 * 客户端：点"授权"调 POST /api/connect/approve 拿回跳 URL，用 location.href 跳过去：
 * 桌面端触发 muicv:// 唤起 electron；扩展的回跳被 launchWebAuthFlow 拦截。备用登录码只给桌面端。
 */
export function ApproveForm({
  state,
  redirect,
  appName,
  lang,
  target,
}: {
  state: string;
  redirect: string;
  appName: string;
  lang: ConnectLang;
  target: ConnectTarget;
}) {
  const copy = connectCopy(lang, target);
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
        body: JSON.stringify({ state, redirect, name: copy.keyName(appName) }),
      });
      const data = (await res.json()) as { redirectUrl: string; key: string } | { error: string; detail?: string };
      if (!res.ok || !('redirectUrl' in data)) {
        throw new Error('detail' in data && data.detail ? data.detail : 'error' in data ? data.error : copy.failed);
      }
      setDone({ key: data.key, redirectUrl: data.redirectUrl });
      // 主动触发 deep link
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.failed);
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
          <p className="text-[16px] font-extrabold">{copy.doneTitle}</p>
          <p className="mt-1 text-ink-soft">{copy.doneBody}</p>
        </div>
        {target === 'desktop' && (
          <>
            <a
              href={done.redirectUrl}
              className="press inline-flex w-full items-center justify-center rounded-lg bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink"
            >
              {copy.reopen}
            </a>
            <details className="rounded-lg border border-rule bg-paper/70 px-4 py-3 text-[12px] text-ink-soft">
              <summary className="cursor-pointer font-bold text-ink">{copy.troubleTitle}</summary>
              <div className="mt-3 space-y-3">
                <p className="leading-[1.6] text-mute">{copy.troubleBody}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCopied(true);
                    void navigator.clipboard.writeText(done.key);
                  }}
                  className="block w-full rounded-lg border-2 border-rule-strong bg-cream px-4 py-2 text-[14px] font-bold text-ink hover:bg-fluff"
                >
                  {copied ? copy.copied : copy.copy}
                </button>
              </div>
            </details>
          </>
        )}
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
        {busy ? copy.busy : copy.approve}
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="block w-full text-center text-[12px] text-mute hover:text-ink"
      >
        {copy.cancel}
      </button>
    </div>
  );
}
