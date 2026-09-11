import { getPlanLabel } from '@muicv/shared';
import { CaretDownIcon, CaretUpIcon, GearIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';

import { useAppStore } from '../lib/store';
import { useClickOutside } from '../lib/use-click-outside';

/**
 * 底部用户菜单：头像 / 邮箱 / 档位 + 弹出去 settings / 退出登录。
 * 未登录时不渲染（让出空间）。
 */
export function UserSection() {
  const session = useAppStore((s) => s.session);
  const setView = useAppStore((s) => s.setView);
  const logout = useAppStore((s) => s.logout);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  if (!session) return null;
  // server 漏返 plan 时 getPlanLabel 兜底为「免费版」，避免误显 Max。
  const planLabel = getPlanLabel(session.plan);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-fluff/60"
      >
        <Avatar session={session} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-bold text-ink">{session.email}</span>
          <span className="block text-[12px] text-mute">{planLabel}</span>
        </span>
        {open ? (
          <CaretDownIcon size={11} weight="bold" className="shrink-0 text-mute" />
        ) : (
          <CaretUpIcon size={11} weight="bold" className="shrink-0 text-mute" />
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl border-2 border-ink bg-cream p-1 shadow-[0_5px_0_0_var(--color-ink)]">
          <button
            type="button"
            onClick={() => {
              setView('settings');
              setOpen(false);
            }}
            className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-[12px] font-medium text-ink hover:bg-fluff"
          >
            <GearIcon size={14} />
            <span>设置</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="block w-full rounded-md px-3 py-2 text-left text-[12px] font-medium text-tongue hover:bg-tongue/10"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({ session }: { session: { name: string; image: string | null } }) {
  if (session.image) {
    return (
      <img src={session.image} alt="" className="h-7 w-7 shrink-0 rounded-full border-2 border-ink object-cover" />
    );
  }
  const initial = session.name?.[0]?.toUpperCase() || 'M';
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-yellow text-[12px] font-extrabold text-ink">
      {initial}
    </div>
  );
}
