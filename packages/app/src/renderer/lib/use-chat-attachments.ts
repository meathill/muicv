import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';

import type { AttachmentRef, Profile } from '../../shared/types.ts';
import { hasFiles } from '../components/chat-attachment-chip';
import {
  cryptoRandomId,
  filterFilesForUpload,
  MAX_ATTACHMENTS_PER_SEND,
  MAX_IMAGES_PER_SEND,
} from '../components/chat-utils.ts';

export { MAX_ATTACHMENTS_PER_SEND, MAX_IMAGES_PER_SEND };

export const ATTACHMENT_ACCEPT = [
  // 文本类
  '.pdf',
  '.docx',
  '.md',
  '.markdown',
  '.txt',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
  // 图像类（走多模态走 vision，不做 OCR）
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
].join(',');
const ATTACHMENT_ERROR_TTL_MS = 4000;

/**
 * 中栏附件托盘的状态机：上传 / drag-drop / 错误冒泡 / 切换上下文重置。
 *
 * 切 profile / 切对话时自动清空所有附件状态，避免「残留的 critique 附件
 * 在新对话被误发」之类的跨上下文污染。输入框文本由调用方各自管理（这里不动）。
 *
 * `acceptImage`：当前模型是否支持图像。设为 false 时图片在 handleFiles 入口
 * 就被挡掉（带友好错误条），避免在 main 进程拼好 input_image 才被上游打 404。
 */
export function useChatAttachments(
  activeProfile: Profile | null,
  conversationId: string | null,
  acceptImage = true,
): ChatAttachmentsApi {
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentRef[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<Array<{ id: string; message: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在切 profile / 对话时清
  useEffect(() => {
    setPendingAttachments([]);
    setAttachmentErrors([]);
    dragDepthRef.current = 0;
    setIsDragging(false);
  }, [activeProfile?.id, conversationId]);

  function pushAttachmentError(message: string): void {
    const id = cryptoRandomId();
    setAttachmentErrors((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setAttachmentErrors((prev) => prev.filter((e) => e.id !== id));
    }, ATTACHMENT_ERROR_TTL_MS);
  }

  async function handleFiles(files: FileList | File[]): Promise<void> {
    if (!activeProfile) {
      pushAttachmentError('先选中一份职业档案再上传');
      return;
    }
    const { accepted, errors } = filterFilesForUpload(Array.from(files), {
      pendingAttachments,
      acceptImage,
      maxAttachments: MAX_ATTACHMENTS_PER_SEND,
      maxImages: MAX_IMAGES_PER_SEND,
    });
    for (const msg of errors) {
      pushAttachmentError(msg);
    }
    if (accepted.length === 0) return;

    setUploadingCount((n) => n + accepted.length);
    try {
      await Promise.allSettled(
        accepted.map(async (file) => {
          try {
            const bytes = await file.arrayBuffer();
            const result = await window.muicv.attachments.save(activeProfile.id, {
              name: file.name,
              mimeType: file.type,
              bytes,
            });
            if (result.ok) {
              setPendingAttachments((prev) => {
                if (prev.some((a) => a.path === result.ref.path)) return prev;
                return [...prev, result.ref];
              });
            } else {
              pushAttachmentError(`${file.name}：${result.message}`);
            }
          } catch (err) {
            pushAttachmentError(`${file.name}：${err instanceof Error ? err.message : String(err)}`);
          } finally {
            setUploadingCount((n) => Math.max(0, n - 1));
          }
        }),
      );
    } catch {
      // allSettled 不会抛，这里兜底防止状态计数泄漏
      setUploadingCount(0);
    }
  }

  function removeAttachment(path: string): void {
    setPendingAttachments((prev) => prev.filter((a) => a.path !== path));
  }

  function clearAfterSend(): void {
    setPendingAttachments([]);
  }

  function onPickFiles(): void {
    fileInputRef.current?.click();
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    if (e.target.files) void handleFiles(e.target.files);
    e.target.value = ''; // 同一文件再选要触发 change
  }

  function onDragEnter(e: DragEvent<HTMLDivElement>): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>): void {
    if (!hasFiles(e)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  function addAttachment(ref: AttachmentRef): void {
    setPendingAttachments((prev) => {
      // 同路径去重，避免连续触发同一次录音 IPC 时残留两条
      if (prev.some((a) => a.path === ref.path)) return prev;
      if (ref.kind === 'image') {
        const imageCount = prev.filter((a) => a.kind === 'image').length;
        if (imageCount >= MAX_IMAGES_PER_SEND) {
          pushAttachmentError(`单次最多上传 ${MAX_IMAGES_PER_SEND} 张图片`);
          return prev;
        }
      }
      return [...prev, ref];
    });
  }

  return {
    pendingAttachments,
    attachmentErrors,
    isDragging,
    uploadingCount,
    fileInputRef,
    handleFiles,
    addAttachment,
    pushAttachmentError,
    removeAttachment,
    clearAfterSend,
    onPickFiles,
    onFileInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  };
}
