'use client';

import { type ReactNode, useEffect } from 'react';

import styles from './preview.module.css';

/**
 * 通用 confirm dialog——不用 native confirm（被浏览器风控易拦），自己渲染。
 * Esc / 点击背景 / 取消按钮都走 onCancel；onConfirm 由 destructive 按钮触发。
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = '取消',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      else if (e.key === 'Enter') onConfirm();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 遮罩点击关闭，模态语义由 alertdialog 承担
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape 关闭已由上方 window keydown 实现
    <div className={styles.modalBackdrop} onClick={onCancel}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: 仅阻止冒泡避免误关，非交互元素 */}
      <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className={styles.confirmTitle}>{title}</div>
        <div className={styles.confirmBody}>{body}</div>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.button} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.button} ${danger ? styles.buttonDanger : styles.buttonPrimary}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
