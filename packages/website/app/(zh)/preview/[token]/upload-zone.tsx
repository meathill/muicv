'use client';

import { type DragEvent, type ReactNode, useRef, useState } from 'react';

import styles from './preview.module.css';

/**
 * 上传区组件——默认支持点击 / 拖拽 / 粘贴三种姿势。
 *
 * - 点击 dropzone 任意位置 → 打开系统文件选择器
 * - 把图片拖入 → drop active 高亮 + 松手即上传
 * - 在 dropzone 聚焦时 Cmd/Ctrl+V 粘贴剪贴板里的图片 → 上传
 *
 * dragenter / dragleave 在嵌套元素之间会反复触发，用 dragCounter 抵消，
 * 避免 active 状态闪烁。
 */
export function UploadZone({
  accept,
  busy,
  hint,
  onPick,
}: {
  accept: string;
  busy: boolean;
  hint: ReactNode;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [active, setActive] = useState(false);

  function pickFromList(list: FileList | null | undefined) {
    const f = list?.[0];
    if (f && /^image\//.test(f.type)) onPick(f);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    if (busy) return;
    dragCounter.current += 1;
    setActive(true);
  }
  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setActive(false);
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setActive(false);
    if (busy) return;
    pickFromList(e.dataTransfer?.files);
  }

  return (
    <div
      className={`${styles.uploadZone} ${active ? styles.uploadZoneActive : ''} ${busy ? styles.uploadZoneBusy : ''}`}
      onClick={() => {
        if (!busy) inputRef.current?.click();
      }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onPaste={(e) => {
        if (busy) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const it of items) {
          if (it.kind === 'file' && /^image\//.test(it.type)) {
            const f = it.getAsFile();
            if (f) {
              onPick(f);
              return;
            }
          }
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (busy) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          pickFromList(e.target.files);
          e.target.value = '';
        }}
      />
      <div className={styles.uploadZoneIcon} aria-hidden>
        ⬆
      </div>
      <div className={styles.uploadZoneTitle}>{busy ? '上传中…' : '点击 / 拖入 / 粘贴上传照片'}</div>
      <div className={styles.uploadZoneHint}>{hint}</div>
    </div>
  );
}
