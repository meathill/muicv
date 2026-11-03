import { Button } from '@muicv/ui';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * 通用确认对话框，替代 window.confirm —— 系统弹框样式跟 app 风格不搭，
 * 而且 macOS 下还会带 Electron Atom 图标。
 *
 * 用法：
 *   const [open, setOpen] = useState(false);
 *   <ConfirmDialog
 *     open={open}
 *     title="..."
 *     description="..."
 *     onConfirm={() => doIt()}
 *     onCancel={() => setOpen(false)}
 *   />
 *
 * Esc / 点 backdrop / 点 Cancel 都触发 onCancel；点 OK 触发 onConfirm
 *（onConfirm 内部需要自己关 dialog，或者用 confirmAndClose 模式）。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'OK',
  cancelLabel = '取消',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  // 用 portal 挂到 body：祖先有 backdrop-filter / transform / filter 等
  // 都会创建 containing block，把 position:fixed 的定位改成相对那个祖先。
  // titlebar 自己用了 backdrop-blur-sm，dropdown 又是这个组件的祖先，
  // 直接渲染会让 dialog 被困在 dropdown 内。
  return createPortal(
    // titlebar-no-drag：portal 到 body 的全屏 dialog 跟 TitleBar 在像素上重叠，
    // TitleBar 的 -webkit-app-region: drag 是 OS 级 hit-testing，按 z-index 拦不住。
    // 整个 portal 显式 no-drag，避免顶部 44px 内 backdrop / 按钮 click 被吃。
    <div className="titlebar-no-drag fixed inset-0 z-[100] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" aria-hidden onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-sm rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_5px_0_0_var(--color-ink)]"
      >
        <h2 id="confirm-title" className="text-[16px] font-extrabold text-ink">
          {title}
        </h2>
        {description && <div className="mt-2 text-[14px] leading-[1.65] text-ink-soft">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} variant="press-ink">
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            onClick={onConfirm}
            variant="press"
            className={destructive ? 'bg-tongue text-cream' : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
