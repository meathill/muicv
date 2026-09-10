import { GitForkIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function ForkConversationDialog({
  open,
  defaultTitle,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  defaultTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, defaultTitle]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm(title.trim() || defaultTitle);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, title, defaultTitle, onCancel, onConfirm]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="titlebar-no-drag fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border-2 border-ink bg-cream p-5 text-ink shadow-[0_4px_0_0_var(--color-ink)] animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink bg-yellow text-ink shadow-[0_1px_0_0_var(--color-ink)]">
              <GitForkIcon size={18} weight="bold" />
            </span>
            <div>
              <h2 className="text-[16px] font-extrabold text-ink">分叉对话</h2>
              <p className="text-[12px] text-ink-soft">由此 AI 发言开启新分支，探索不同方案</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="press inline-flex h-7 w-7 items-center justify-center rounded-lg text-mute hover:bg-rule/40 hover:text-ink"
            aria-label="关闭"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fork-title-input" className="text-[12px] font-bold text-ink-soft">
            新对话名称
          </label>
          <input
            id="fork-title-input"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入分支对话名称…"
            className="w-full rounded-lg border-2 border-rule-strong bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="press inline-flex items-center justify-center rounded-lg border-2 border-rule bg-paper px-3.5 py-1.5 text-[14px] font-bold text-ink-soft hover:bg-rule/40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(title.trim() || defaultTitle)}
            className="press inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-yellow px-4 py-1.5 text-[14px] font-bold text-ink shadow-[0_2px_0_0_var(--color-ink)]"
          >
            <GitForkIcon size={16} weight="bold" />
            <span>分叉并前往</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
