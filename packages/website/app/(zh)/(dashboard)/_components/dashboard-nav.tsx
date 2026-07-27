'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeToggle } from '../../../_theme/theme-toggle';

type NavItem = {
  href: string;
  label: string;
  hint?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '概览', hint: '邮箱与余额' },
  { href: '/dashboard/api-keys', label: '桌面应用凭证', hint: 'API Keys' },
  { href: '/dashboard/muirouter', label: '自带 API', hint: 'muirouter' },
  { href: '/dashboard/sync', label: '云同步', hint: '素材库快照' },
  { href: '/dashboard/previews', label: '在线预览', hint: '可分享链接' },
  { href: '/dashboard/pricing', label: '订阅 / 充值', hint: '月卡 + 补充包' },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ variant }: { variant: 'sidebar' | 'tabs' }) {
  const pathname = usePathname();

  if (variant === 'tabs') {
    return (
      <nav
        aria-label="Dashboard 导航"
        className="-mx-5 flex gap-2 overflow-x-auto border-b border-rule px-5 py-2 md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const current = isCurrent(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-[14px] font-bold transition ${
                current
                  ? 'border-ink bg-fluff text-ink shadow-[0_2px_0_0_var(--color-ink-line)]'
                  : 'border-rule bg-paper text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <aside className="hidden w-60 shrink-0 md:block">
      <div className="sticky top-20 flex flex-col gap-3">
        <nav aria-label="Dashboard 导航" className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`group rounded-xl border-2 px-4 py-3 transition ${
                  current
                    ? 'border-ink bg-cream shadow-[0_3px_0_0_var(--color-ink-line)]'
                    : 'border-transparent hover:border-rule hover:bg-paper'
                }`}
              >
                <p
                  className={`text-[14px] font-extrabold ${current ? 'text-ink' : 'text-ink-soft group-hover:text-ink'}`}
                >
                  {item.label}
                </p>
                {item.hint && (
                  <p className={`mt-0.5 text-[12px] ${current ? 'text-yellow-deep' : 'text-mute'}`}>{item.hint}</p>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-2 border-t border-rule pt-3">
          <p className="mb-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-mute">主题</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
