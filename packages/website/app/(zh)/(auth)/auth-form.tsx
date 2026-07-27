'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signIn, signUp } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

const COPY: Record<Mode, { title: string; cta: string; alt: { text: string; href: string; label: string } }> = {
  'sign-in': {
    title: '欢迎回来',
    cta: '登录',
    alt: { text: '还没账号？', href: '/sign-up', label: '注册一个 →' },
  },
  'sign-up': {
    title: '加入 Mui简历',
    cta: '注册',
    alt: { text: '已经有账号？', href: '/sign-in', label: '去登录 →' },
  },
};

export function AuthForm({
  mode,
  githubEnabled = false,
  next,
}: {
  mode: Mode;
  githubEnabled?: boolean;
  next?: string | undefined;
}) {
  const router = useRouter();
  const copy = COPY[mode];
  // 登录后跳哪里：next（站内相对路径）优先，否则 dashboard
  const successTarget = next && next.startsWith('/') ? next : '/dashboard';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const result = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split('@')[0] || '新朋友',
        });
        if (result.error) throw new Error(result.error.message ?? '注册失败');
      } else {
        const result = await signIn.email({
          email: email.trim(),
          password,
        });
        if (result.error) throw new Error(result.error.message ?? '邮箱或密码不对');
      }
      router.push(successTarget);
      router.refresh();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '出错了，再试一次？');
    } finally {
      setBusy(false);
    }
  }

  async function onGitHub() {
    setErrorMsg(null);
    setBusy(true);
    try {
      // 这一步会跳转到 GitHub 授权页，不会 resolve 回来；finally 在跳转后执行也没关系
      await signIn.social({
        provider: 'github',
        callbackURL: successTarget,
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'GitHub 登录出错');
      setBusy(false);
    }
  }

  return (
    <div>
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{copy.title}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          {copy.alt.text}{' '}
          <Link
            href={next ? `${copy.alt.href}?next=${encodeURIComponent(next)}` : copy.alt.href}
            className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
          >
            {copy.alt.label}
          </Link>
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mt-7 space-y-4 rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_5px_0_0_var(--color-ink-line)]"
      >
        {githubEnabled && (
          <>
            <button
              type="button"
              onClick={onGitHub}
              disabled={busy}
              className="press-ink inline-flex w-full items-center justify-center gap-2.5 rounded-lg border-2 border-ink bg-cream px-4 py-2.5 text-[14px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GitHubIcon />用 GitHub {mode === 'sign-up' ? '注册' : '登录'}
            </button>

            <div className="relative my-1 flex items-center gap-3">
              <span className="h-0.5 flex-1 bg-rule" aria-hidden />
              <span className="font-mono text-[12px] uppercase tracking-wider text-mute">或</span>
              <span className="h-0.5 flex-1 bg-rule" aria-hidden />
            </div>
          </>
        )}

        {mode === 'sign-up' && (
          <Field
            id="name"
            label="昵称（可选）"
            type="text"
            value={name}
            onChange={setName}
            disabled={busy}
            placeholder="你想我们怎么叫你？"
            autoComplete="nickname"
          />
        )}
        <Field
          id="email"
          label="邮箱"
          type="email"
          required
          value={email}
          onChange={setEmail}
          disabled={busy}
          placeholder="your@email.com"
          autoComplete="email"
        />
        <Field
          id="password"
          label="密码"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={setPassword}
          disabled={busy}
          placeholder="至少 8 位"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        />

        {errorMsg && (
          <div
            role="alert"
            className="rounded-lg border-2 border-tongue/60 bg-tongue/10 px-3 py-2 text-[14px] font-medium text-tongue"
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-yellow px-4 py-2.5 text-[16px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              处理中…
            </>
          ) : (
            <>用邮箱{copy.cta} 🐾</>
          )}
        </button>
      </form>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 2 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"
      />
    </svg>
  );
}

function Field({
  id,
  label,
  type,
  required,
  minLength,
  value,
  onChange,
  disabled,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: 'text' | 'email' | 'password';
  required?: boolean;
  minLength?: number;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[14px] font-bold text-ink">{label}</span>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 block w-full rounded-lg border-2 border-rule-strong bg-cream px-3.5 py-2.5 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 disabled:opacity-60"
      />
    </label>
  );
}
