import {
  DownloadSimpleIcon,
  MicrophoneIcon,
  PaperclipIcon,
  SpinnerGapIcon,
  StopIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { modelSupportsAudioInput } from '@muicv/shared';

import type { AttachmentRef } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';
import {
  ATTACHMENT_ACCEPT,
  type ChatAttachmentsApi,
  MAX_ATTACHMENTS_PER_SEND,
  MAX_IMAGES_PER_SEND,
} from '../lib/use-chat-attachments';
import { useChatInputPaste } from '../lib/use-chat-input-paste';
import { useChatInputRecorder } from '../lib/use-chat-input-recorder';
import { useRecorder } from '../lib/use-recorder';
import { useSlashCommand } from '../lib/use-slash-command.ts';
import { AttachmentPreviewDialog } from './attachment-preview-dialog';
import { AttachmentChip } from './chat-attachment-chip';
import { RecordingBar } from './recording-bar';
import { SlashCommandMenu } from './slash-command-menu.tsx';

type Props = {
  /** profile.id + ':' + conversation.id；切换上下文时变更，触发草稿清空。 */
  contextKey: string;
  placeholder: string;
  initialDraft?: string | null;
  busy: boolean;
  errorMessage: string | null;
  attachments: ChatAttachmentsApi;
  onMicError: (message: string) => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  /** issue #6：失败面板的"安装本地模型"按钮跳设置页用。 */
  onOpenSettings?: () => void;
};

/**
 * 中栏底部输入面板：mic / paperclip / textarea / send-or-stop + slash 菜单 +
 * 错误条 + 附件 chip 列表 + 上传中提示。
 *
 * 内部维护 input 草稿；切 profile / 切对话靠 contextKey 变化触发清空，
 * 父组件只负责提供两个 id 拼成的 key。语音 / 粘贴 / 录音失败兜底逻辑分别拆到了
 * use-chat-input-recorder / use-chat-input-paste，本组件只负责拼装 + JSX。
 */
export function ChatInputBar({
  contextKey,
  placeholder,
  initialDraft,
  busy,
  errorMessage,
  attachments,
  onMicError,
  onSend,
  onAbort,
  onOpenSettings,
}: Props) {
  const [input, setInput] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentRef | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  // setInput 提交后再 focus + setSelectionRange 落光标（复用 use-slash-command 的模式）。
  const pendingCursorRef = useRef<number | null>(null);
  const slash = useSlashCommand({ value: input, onChange: setInput, textareaRef });
  const activeProfileId = useAppStore((s) => s.activeProfile?.id ?? null);
  const defaultModel = useAppStore((s) => s.config.defaultModel);
  const audioPassthrough = modelSupportsAudioInput(defaultModel);

  const recorderState = useChatInputRecorder({
    textareaRef,
    getInput: () => input,
    setInput,
    pendingCursorRef,
    onMicError,
    audioPassthrough,
    audioPassthroughDeps: { profileId: activeProfileId, addAttachment: attachments.addAttachment },
  });
  const handlePaste = useChatInputPaste(attachments);

  // 录音状态机：mic 按钮和 agent tool 都通过 main → audio:recording-request 走到这里，
  // 统一渲染内嵌 RecordingBar，不再用全屏 dialog。完成 / 取消 / 错误回 IPC 给 main。
  const recorder = useRecorder({
    onComplete: (req, payload) => {
      void window.muicv.audio.complete(req.requestId, payload);
    },
    onCancel: (req, reason) => {
      void window.muicv.audio.cancel(req.requestId, reason);
    },
    onError: (req, reason) => {
      void window.muicv.audio.cancel(req.requestId, reason);
    },
  });
  const recorderApiRef = useRef(recorder);
  recorderApiRef.current = recorder;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 只在挂载时订阅；recorder 走 ref 引用
  useEffect(() => {
    const unsub = window.muicv.audio.onRecordingRequest((req) => {
      void recorderApiRef.current.start(req);
    });
    return () => unsub();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅 contextKey 触发清空
  useEffect(() => {
    setInput(initialDraft ?? '');
    setPreviewAttachment(null);
    recorderState.resetOnContextChange();
  }, [contextKey, initialDraft]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ref 不入 deps（引用稳定，.current 不触发 re-render）
  useEffect(() => {
    const pos = pendingCursorRef.current;
    if (pos == null) return;
    pendingCursorRef.current = null;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(pos, pos);
  }, [input]);

  // 预览的附件被移除（或发送后清空）→ 自动关 dialog，避免预览空文件
  useEffect(() => {
    if (!previewAttachment) return;
    const stillThere = attachments.pendingAttachments.some((a) => a.path === previewAttachment.path);
    if (!stillThere) setPreviewAttachment(null);
  }, [attachments.pendingAttachments, previewAttachment]);

  // textarea 自适应高度：2 行起步，最多 10 行；超过 10 行内部滚动。
  // 用 useLayoutEffect 在 paint 之前同步改高度，避免抖一帧。reset 到 auto
  // 让 scrollHeight 反映真实内容（不被上一次设的 height 卡住）。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const cs = getComputedStyle(ta);
    const fontSize = Number.parseFloat(cs.fontSize) || 14;
    const lhRaw = cs.lineHeight;
    const lh = lhRaw === 'normal' ? fontSize * 1.4 : Number.parseFloat(lhRaw) || fontSize * 1.4;
    const py = (Number.parseFloat(cs.paddingTop) || 0) + (Number.parseFloat(cs.paddingBottom) || 0);
    const minHeight = lh * 2 + py;
    const maxHeight = lh * 10 + py;
    const target = Math.max(minHeight, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${target}px`;
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [input]);

  function handleSendClick() {
    const text = input.trim();
    if (!text && attachments.pendingAttachments.length === 0) return;
    if (busy) return;
    onSend(text);
    setInput('');
  }

  const canSend =
    (input.trim().length > 0 || attachments.pendingAttachments.length > 0) && attachments.uploadingCount === 0;

  const { recording, failedAudio, retryPending, info } = recorderState;

  return (
    <div className="border-t border-rule bg-cream/85 px-6 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        {errorMessage && (
          <p role="alert" className="text-[12px] text-tongue">
            {errorMessage}
          </p>
        )}
        {info && (
          <p role="status" aria-live="polite" className="text-[12px] text-ink-soft">
            {info}
          </p>
        )}
        {failedAudio && (
          <div
            role="alert"
            aria-live="polite"
            className="flex flex-col gap-2 rounded-xl border-2 border-rule-strong bg-cream px-3 py-2 text-[12px] text-ink"
          >
            <p>转写失败，已保留这段录音（{Math.round(failedAudio.durationMs / 1000)} 秒）。</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void recorderState.handleRetryTranscribe()}
                disabled={retryPending}
                className="press-ink inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-2.5 py-1 text-[12px] font-medium text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryPending ? (
                  <>
                    <SpinnerGapIcon size={12} weight="bold" className="animate-spin" />
                    重试中…
                  </>
                ) : (
                  '重试转写'
                )}
              </button>
              <button
                type="button"
                onClick={recorderState.handleDownloadFailedAudio}
                className="press-ink inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-2.5 py-1 text-[12px] font-medium text-ink transition hover:border-ink"
              >
                <DownloadSimpleIcon size={12} weight="bold" />
                下载录音
              </button>
              {!failedAudio.localReady && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="press-ink inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-2.5 py-1 text-[12px] font-medium text-ink transition hover:border-ink"
                >
                  安装本地模型
                </button>
              )}
              <button
                type="button"
                onClick={recorderState.clearFailedAudio}
                className="press-ink ml-auto inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-2.5 py-1 text-[12px] font-medium text-ink-soft transition hover:border-ink hover:text-ink"
                aria-label="放弃这段录音"
              >
                <TrashIcon size={12} weight="bold" />
                放弃
              </button>
            </div>
          </div>
        )}
        {attachments.attachmentErrors.length > 0 && (
          <div className="flex flex-col gap-1">
            {attachments.attachmentErrors.map((e) => (
              <p key={e.id} role="alert" className="text-[12px] text-tongue">
                {e.message}
              </p>
            ))}
          </div>
        )}
        {(attachments.pendingAttachments.length > 0 || attachments.uploadingCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {attachments.pendingAttachments.map((a) => (
              <AttachmentChip
                key={a.path}
                attachment={a}
                onRemove={() => attachments.removeAttachment(a.path)}
                onPreview={() => setPreviewAttachment(a)}
              />
            ))}
            {attachments.uploadingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-paper px-2.5 py-1 text-[12px] text-ink-soft">
                <SpinnerGapIcon size={12} weight="bold" className="animate-spin" />
                上传中…（{attachments.uploadingCount}）
              </span>
            )}
          </div>
        )}
        <input
          ref={attachments.fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="hidden"
          onChange={attachments.onFileInputChange}
        />
        {recorder.phase === 'idle' ? (
          <div
            ref={inputContainerRef}
            className="flex items-end gap-2 rounded-xl border-2 border-rule-strong bg-cream p-2 transition focus-within:border-ink"
          >
            <button
              type="button"
              onClick={() => void recorderState.handleMicClick()}
              disabled={busy || recording}
              title={recording ? '录音 / 转写中…' : '语音输入（最长 3 分钟）'}
              className="press-ink inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-rule-strong bg-cream p-2 text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="语音输入"
            >
              {recording ? (
                <SpinnerGapIcon size={18} weight="bold" className="animate-spin" />
              ) : (
                <MicrophoneIcon size={18} weight="regular" />
              )}
            </button>
            <button
              type="button"
              onClick={attachments.onPickFiles}
              disabled={busy || attachments.pendingAttachments.length >= MAX_ATTACHMENTS_PER_SEND}
              title={`上传附件（PDF / DOCX / Markdown / 文本 / 图像；也可以直接拖入或粘贴。单文件 ≤ 20MB，单次最多 ${MAX_ATTACHMENTS_PER_SEND} 个，图片最多 ${MAX_IMAGES_PER_SEND} 张）`}
              className="press-ink inline-flex shrink-0 items-center justify-center rounded-lg border-2 border-rule-strong bg-cream p-2 text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="上传附件"
            >
              <PaperclipIcon size={18} weight="regular" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (slash.handleKeyDown(e)) return;
                if (e.nativeEvent.isComposing) return;
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSendClick();
              }}
              onPaste={handlePaste}
              onContextMenu={(e) => {
                // 拦下 Chromium 默认空菜单，让主进程弹 native 编辑菜单
                e.preventDefault();
                window.muicv.chatInput.showContextMenu({ editable: true });
              }}
              placeholder={placeholder}
              disabled={busy}
              rows={2}
              className="flex-1 resize-none rounded-lg bg-transparent px-3 py-2 text-[14px] leading-[1.5] text-ink placeholder:text-mute focus:outline-none disabled:opacity-60"
            />
            {busy ? (
              <button
                type="button"
                onClick={onAbort}
                className="press-ink inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-ink bg-cream px-3.5 py-2 text-[14px] font-bold text-ink"
              >
                <span>停</span>
                <StopIcon size={12} weight="fill" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendClick}
                disabled={!canSend}
                className="press shrink-0 rounded-lg bg-yellow px-3.5 py-2 text-[14px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                发送 ⌘↵
              </button>
            )}
          </div>
        ) : (
          <RecordingBar
            phase={recorder.phase}
            elapsedMs={recorder.elapsedMs}
            limitSec={recorder.active?.durationLimitSec ?? 180}
            rms={recorder.rms}
            errorMsg={recorder.errorMsg}
            onCancel={() => recorder.cancel('user-cancel')}
            onFinish={() => recorder.finish()}
          />
        )}
        <SlashCommandMenu
          open={slash.menuOpen}
          anchor={inputContainerRef.current}
          items={slash.items}
          activeIndex={slash.activeIndex}
          onPick={slash.pick}
          onHover={slash.setActiveIndex}
          onOpenChange={(open) => {
            if (!open) slash.closeAndKeep();
          }}
        />
      </div>
      <AttachmentPreviewDialog attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} />
    </div>
  );
}
