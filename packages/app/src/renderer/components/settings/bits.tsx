/**
 * 设置页内多张卡复用的小组件 / 常量。
 */

import { Button } from '@muicv/ui';

export const DASHBOARD_URL = 'https://muicv.com/dashboard';
export const MUIROUTER_URL = 'https://muirouter.com';

export function Avatar({ session }: { session: { name: string; image: string | null } }) {
  if (session.image) {
    return <img src={session.image} alt="" className="h-12 w-12 rounded-full border-2 border-ink object-cover" />;
  }
  const initial = session.name?.[0]?.toUpperCase() || 'M';
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-yellow font-display text-xl font-extrabold text-ink">
      {initial}
    </div>
  );
}

export function ExternalButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Button
      onClick={() => void window.muicv.shell.openExternal(href)}
      variant={primary ? 'press' : 'outline'}
      size="xs"
      className={primary ? undefined : 'border-2 border-rule-strong font-bold hover:bg-fluff'}
    >
      {label}
    </Button>
  );
}
