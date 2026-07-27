import Link from 'next/link';

const TABS: { href: string; label: string; matchPrefix: string }[] = [
  { href: '/admin/users', label: '用户', matchPrefix: '/admin/users' },
  { href: '/admin/grants', label: '赠予记录', matchPrefix: '/admin/grants' },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 border-b border-rule pb-2 text-[14px] font-bold">
      {TABS.map((tab) => {
        const isActive = active.startsWith(tab.matchPrefix);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              isActive
                ? 'rounded-md bg-yellow px-3 py-1.5 text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)]'
                : 'rounded-md px-3 py-1.5 text-ink-soft transition hover:bg-fluff hover:text-ink'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
