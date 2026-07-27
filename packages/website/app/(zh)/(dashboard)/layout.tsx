import { DownloadSimple } from '@phosphor-icons/react/dist/ssr';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CorgiMascot } from '@/components/corgi-mascot';
import { getAuth } from '@/lib/auth';

import { DashboardNav } from './_components/dashboard-nav';
import { SignOutButton } from './sign-out-button';

// 整个 dashboard 段是 per-user 的，强制 SSR
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Dashboard 受保护 layout —— Server Component 内验证 session（Workers 环境下
 * 比 middleware 更可靠，参见调研报告 issue #4203）。未登录跳 /sign-in。
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userName = session.user.name || session.user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-rule bg-cream/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
            <CorgiMascot className="h-8 w-8" />
            <span className="text-[18px] font-bold tracking-tight">Mui简历</span>
            <span className="hidden font-mono text-[12px] font-semibold uppercase tracking-wider text-mute sm:inline">
              dashboard
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/download"
              className="press inline-flex items-center gap-1.5 rounded-lg bg-yellow px-3 py-1.5 text-[14px] font-bold text-ink"
            >
              <DownloadSimple size={14} weight="bold" />
              <span className="hidden sm:inline">下载桌面 app</span>
              <span className="sm:hidden">桌面 app</span>
            </Link>
            <span className="hidden text-[14px] text-ink-soft sm:inline">
              👋 <span className="font-semibold text-ink">{userName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <DashboardNav variant="tabs" />
        <div className="flex gap-10 py-8 md:py-12">
          <DashboardNav variant="sidebar" />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
