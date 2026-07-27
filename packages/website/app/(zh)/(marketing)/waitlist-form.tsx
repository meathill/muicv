'use client';

import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'already' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_MUICV_API_BASE ?? 'https://api.muicv.com';

export function WaitlistForm({ source }: { source: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/waitlist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      if (res.status === 201) {
        setStatus('success');
        setEmail('');
        return;
      }
      if (res.status === 409) {
        setStatus('already');
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus('error');
      setErrorMsg(body.error ?? `HTTP ${res.status}`);
    } catch (error) {
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : '网络错误');
    }
  }

  if (status === 'success' || status === 'already') {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border-2 border-ink bg-cream px-4 py-3 text-[14px] text-ink"
      >
        <span aria-hidden className="mt-0.5 text-base">
          🐾
        </span>
        <span className="leading-snug">
          {status === 'success' ? (
            <>
              <strong className="font-bold">收到啦！</strong> 桌面 app 上线第一时间通知你。
            </>
          ) : (
            <>
              <strong className="font-bold">你已经在 waitlist 里了</strong> — Mui 一直记得你呢。
            </>
          )}
        </span>
      </div>
    );
  }

  const isLoading = status === 'loading';

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="waitlist-email">
          邮箱
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          disabled={isLoading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-lg border-2 border-ink bg-cream px-3.5 py-2.5 text-[14px] text-ink placeholder:text-mute focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              提交中
            </>
          ) : (
            <>加入 Waitlist</>
          )}
        </button>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-[14px] font-medium text-tongue">
          提交失败：{errorMsg ?? '请稍后重试'}
        </p>
      )}
    </form>
  );
}
