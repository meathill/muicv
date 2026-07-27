import Link from 'next/link';

import { CorgiMascot } from '@/components/corgi-mascot';
import { requireAdmin } from '@/lib/admin';

import { SignOutButton } from '../(dashboard)/sign-out-button';

export const dynamic = 'force-dynamic';

/**
 * /admin 受保护 layout —— Server Component 内 requireAdmin()，非白名单邮箱直接 notFound()，
 * 不暴露后台存在。布局复用 dashboard 的视觉语言（顶部 header + 主内容区）。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-fluff/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
            <CorgiMascot className="h-8 w-8" />
            <span className="text-[18px] font-bold tracking-tight">Mui简历</span>
            <span className="hidden font-mono text-[12px] font-semibold uppercase tracking-wider text-yellow-deep sm:inline">
              admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded px-2.5 py-1.5 text-[14px] text-ink-soft transition hover:bg-cream hover:text-ink sm:inline-block"
            >
              ← 我的 Dashboard
            </Link>
            <span className="hidden text-[14px] text-ink-soft sm:inline">
              🛡️ <span className="font-mono font-semibold text-ink">{session.user.email}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
