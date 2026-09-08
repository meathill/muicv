import type { ClipboardEvent } from 'react';

import type { ChatAttachmentsApi } from './use-chat-attachments';

/**
 * 从 ClipboardEvent.clipboardData 提取待上传的文件列表。
 *
 * 优先从 cd.files 取；若 cd.files 为空（某些老旧浏览器或特定环境截屏只在 cd.items 中），
 * 再回退到 cd.items[].getAsFile()。
 * 不要同时把 cd.files 和 cd.items 的文件无条件合并：
 * 现代 Chromium / Electron 中，cd.files 与 cd.items (kind === 'file') 是同一批文件；
 * 且剪贴板图像合成的 File 对象的 lastModified 是由引擎动态生成的 Date.now()，
 * 若两边都读并依赖 lastModified 去重，会因微小的毫秒时间差导致去重失效，从而把同一张图重复上传两次。
 */
export function extractClipboardFiles(cd: Pick<DataTransfer, 'files' | 'items'> | null | undefined): File[] {
  if (!cd) return [];

  let rawFiles: File[] = [];
  if (cd.files && cd.files.length > 0) {
    rawFiles = Array.from(cd.files);
  } else if (cd.items && cd.items.length > 0) {
    for (const it of Array.from(cd.items)) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) rawFiles.push(f);
      }
    }
  }

  if (rawFiles.length === 0) return [];

  // 按 name + size 粗粒度去重，避免单次粘贴中含有完全相同的重复文件
  const seen = new Set<string>();
  const uniqueFiles: File[] = [];
  for (const f of rawFiles) {
    const key = `${f.name}:${f.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(f);
    }
  }
  return uniqueFiles;
}

/**
 * textarea 粘贴 handler。拦下任何带文件的剪贴板内容（截图 / 拷贝文件 / 浏览器复制图片）
 * 走统一的 attachments.handleFiles 上传管线；纯文本粘贴不动，照常走 textarea 默认。
 */
export function useChatInputPaste(attachments: ChatAttachmentsApi): (e: ClipboardEvent<HTMLTextAreaElement>) => void {
  return function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>): void {
    const files = extractClipboardFiles(e.clipboardData);
    if (files.length === 0) return;
    e.preventDefault();
    void attachments.handleFiles(files);
  };
}
