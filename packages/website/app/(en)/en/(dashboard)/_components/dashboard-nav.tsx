'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeToggle } from '@/app/_theme/theme-toggle';

type NavItem = {
  href: string;
  label: string;
  hint?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/en/dashboard', label: 'Overview', hint: 'Email & balance' },
  { href: '/en/dashboard/api-keys', label: 'Desktop app keys', hint: 'API Keys' },
  { href: '/en/dashboard/muirouter', label: 'Bring your own API', hint: 'muirouter' },
  { href: '/en/dashboard/sync', label: 'Cloud sync', hint: 'Library snapshots' },
  { href: '/en/dashboard/previews', label: 'Online previews', hint: 'Shareable links' },
  { href: '/en/dashboard/jobs', label: 'My contributed jobs', hint: 'Community JDs' },
  { href: '/en/dashboard/submissions', label: 'Submissions', hint: 'Extension · credits' },
  { href: '/en/dashboard/pricing', label: 'Plans & top-up', hint: 'Subscription + packs' },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/en/dashboard') return pathname === '/en/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ variant }: { variant: 'sidebar' | 'tabs' }) {
  const pathname = usePathname();

  if (variant === 'tabs') {
    return (
      <nav
        aria-label="Dashboard navigation"
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
        <nav aria-label="Dashboard navigation" className="flex flex-col gap-1.5">
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
          <p className="mb-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-mute">Theme</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
