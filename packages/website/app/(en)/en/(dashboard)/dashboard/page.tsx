import { microToDisplay } from '@muicv/shared';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { ensureBalance } from '@/lib/wallet';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // layout 已守过门，这里再读是为了拿 user 信息渲染
  const user = session?.user;
  if (!user) return null;

  // 进 dashboard 也是 lazy init 入口（用户可能从未访问 /api/me），
  // 第一次进来给写 signup_bonus + 余额行
  const wallet = await ensureBalance(user.id);

  return (
    <div className="space-y-10">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Account</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-[1.1] tracking-tight text-ink">
          Welcome back{user.name ? `, ${user.name}` : ''}.
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          New here? Download the desktop app first. After you sign in it walks you through importing a resume or
          recording your first experience — faster than digging through settings.
        </p>
      </header>

      <section className="rounded-xl border-2 border-ink bg-corgi/30 p-6 shadow-[0_4px_0_0_var(--color-yellow-shadow)]">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
              — Recommended next step
            </p>
            <h2 className="mt-2 text-[18px] font-extrabold text-ink">
              Open the desktop app and create your first career material
            </h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">
              Available on macOS, Windows and Linux. After your first sign-in, the app helps you pick a starting point:
              import an existing resume, paste an experience, or start from scratch.
            </p>
          </div>
          <a
            href="/en/download"
            className="press inline-flex shrink-0 items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[14px] font-bold text-ink"
          >
            Download the desktop app
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card label="Email" value={user.email} />
        <Card
          label="Token balance"
          value={microToDisplay(wallet.balance).toLocaleString()}
          hint={
            wallet.justInitialized
              ? 'Your sign-up bonus has arrived; cloud features will draw from it'
              : 'PDFs, job fetching and cloud models share this balance'
          }
        />
      </section>

      <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
        <h2 className="text-[18px] font-extrabold text-ink">Advanced: already using an AI assistant?</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">
          If you use Claude Code / Codex / Cursor / OpenCode, you can install the skill directly instead of the desktop
          app:
        </p>
        <ol className="mt-4 space-y-2 text-[14px] leading-[1.7] text-ink-soft">
          <li>
            🐾 Install the skill from your terminal:
            <code className="ml-1 rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep ring-1 ring-corgi/40">
              npx skills add meathill/muicv -g
            </code>
          </li>
          <li>🐾 Tell Claude / Codex"help me prepare my resume"and the skill takes it from there</li>
          <li>🐾 Cloud calls draw from this balance, shared with the desktop app</li>
        </ol>
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">{label}</p>
      <p className="mt-2 break-words text-[16px] font-bold text-ink">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-mute">{hint}</p>}
    </div>
  );
}
