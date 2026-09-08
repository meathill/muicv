import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react';

import type { AttachmentRef, Profile } from '../../shared/types.ts';
import { cryptoRandomId } from '../components/chat-utils';
import { hasFiles } from '../components/chat-attachment-chip';

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
export const MAX_ATTACHMENTS_PER_SEND = 5;
const ATTACHMENT_ERROR_TTL_MS = 4000;

export type ChatAttachmentsApi = {
  pendingAttachments: AttachmentRef[];
  attachmentErrors: Array<{ id: string; message: string }>;
  isDragging: boolean;
  uploadingCount: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFiles: (files: FileList | File[]) => Promise<void>;
  /** 直接推一个已经落盘的 ref 进 pending 列表（不重复上传）。给麦克风音频直通用。 */
  addAttachment: (ref: AttachmentRef) => void;
  /** 给外部冒泡错误（mic-denied / 录音失败等）用，复用同一份 TTL 自清队列。 */
  pushAttachmentError: (message: string) => void;
  removeAttachment: (path: string) => void;
  clearAfterSend: () => void;
  onPickFiles: () => void;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(ext);
}

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
    let list = Array.from(files);
    if (list.length === 0) return;

    // 单批次内按 name + size 粗粒度去重，防止误传完全重复的文件
    const seen = new Set<string>();
    list = list.filter((f) => {
      const key = `${f.name}:${f.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!acceptImage) {
      const blocked = list.filter(isImageFile);
      if (blocked.length > 0) {
        pushAttachmentError(`当前模型不支持图片（${blocked.map((f) => f.name).join('、')}），请切到支持 vision 的模型`);
      }
      list = list.filter((f) => !isImageFile(f));
      if (list.length === 0) return;
    }

    const remaining = MAX_ATTACHMENTS_PER_SEND - pendingAttachments.length;
    if (remaining <= 0) {
      pushAttachmentError(`一次最多 ${MAX_ATTACHMENTS_PER_SEND} 个附件，先发一轮再传`);
      return;
    }
    const accepted = list.slice(0, remaining);
    if (list.length > remaining) {
      pushAttachmentError(`一次最多 ${MAX_ATTACHMENTS_PER_SEND} 个附件，多余的 ${list.length - remaining} 个跳过`);
    }

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
