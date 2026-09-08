import { CheckCircleIcon, InfoIcon, WarningCircleIcon, WarningIcon, XIcon } from '@phosphor-icons/react';

import { type ToastType, useToastStore } from '../lib/toast';

const ICON_MAP: Record<ToastType, typeof InfoIcon> = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: WarningCircleIcon,
};

const COLOR_MAP: Record<ToastType, { border: string; bg: string; icon: string }> = {
  info: { border: 'border-info/40', bg: 'bg-cream', icon: 'text-info' },
  success: { border: 'border-success/40', bg: 'bg-cream', icon: 'text-success' },
  warning: { border: 'border-warning/50', bg: 'bg-cream', icon: 'text-warning' },
  error: { border: 'border-danger/50', bg: 'bg-cream', icon: 'text-danger' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-10 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICON_MAP[t.type];
        const colors = COLOR_MAP[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border-2 ${colors.border} ${colors.bg} p-3 shadow-[0_4px_16px_rgba(58,46,35,0.12)] transition-all animate-in fade-in slide-in-from-top-2`}
          >
            <Icon size={16} weight="fill" className={`mt-0.5 shrink-0 ${colors.icon}`} />
            <div className="min-w-0 flex-1">
              {t.title && <div className="text-[12px] font-bold text-ink">{t.title}</div>}
              <div className="text-[12px] text-ink-soft break-words leading-relaxed">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="mt-0.5 shrink-0 text-mute hover:text-ink transition p-0.5 rounded"
              title="关闭"
            >
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
