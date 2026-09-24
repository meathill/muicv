import { type RefObject, useEffect, useRef, useState } from 'react';

import type { AttachmentRef, AudioFailedRecording, AudioRecordOutcome } from '../../shared/types.ts';

type Opts = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** 读当前 input 字符串。用 getter 而不是值，确保 callback 闭包内总是拿最新。 */
  getInput: () => string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  /** 与 use-slash-command 共享的"setInput 后 focus + setSelectionRange"模式。 */
  pendingCursorRef: RefObject<number | null>;
  onMicError: (message: string) => void;
  /**
   * 当前模型是否原生听音频（mimo-v2.6-flash 全模态）。true 时麦克风按下走 recordAndAttach
   * 把 wav 落 inbox/ 当 audio 附件，跳过 Whisper STT；false 时走老的 recordAndTranscribe。
   */
  audioPassthrough?: boolean;
  /** audioPassthrough = true 时用：把录音附件 push 进 chatbox 待发送列表。 */
  audioPassthroughDeps?: {
    profileId: string | null;
    addAttachment: (ref: AttachmentRef) => void;
  };
};

/**
 * chat 输入面板的录音 / 转写 / 失败降级状态机。
 *
 * 把这些粘合到一个 hook 里：
 *   - mic 按钮按下后 cursorAtClickRef 快照 textarea 选区；
 *     转写成功用快照位置插入 transcript（避免用户后续点击别处后插错位）
 *   - 转写失败保留 wav → 父组件渲染"重试 / 下载 / 装本地模型"卡片
 *   - 重试时用当前选区再插一次（原快照已过期）
 *   - local-fallback 成功后弹一个 3.5s 自清 info（"已用本地模型转写"）
 *
 * 不负责录音 UI（RecordingBar）；那块走 useRecorder + main 端 audio:recording-request
 * 单独管。本 hook 只关心结果 → 文本插入。
 */
export function useChatInputRecorder(opts: Opts): {
  recording: boolean;
  failedAudio: (AudioFailedRecording & { localReady?: boolean }) | null;
  retryPending: boolean;
  info: string | null;
  handleMicClick: () => Promise<void>;
  handleRetryTranscribe: () => Promise<void>;
  handleDownloadFailedAudio: () => void;
  clearFailedAudio: () => void;
  resetOnContextChange: () => void;
} {
  const [recording, setRecording] = useState(false);
  const [failedAudio, setFailedAudio] = useState<(AudioFailedRecording & { localReady?: boolean }) | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const cursorAtClickRef = useRef<{ start: number; end: number; focused: boolean } | null>(null);

  useEffect(() => {
    if (!info) return;
    const id = setTimeout(() => setInfo(null), 3500);
    return () => clearTimeout(id);
  }, [info]);

  function insertTranscriptAtCursor(
    transcript: string,
    anchor: { start: number; end: number; focused: boolean },
  ): void {
    opts.setInput((prev) => {
      if (!anchor.focused) {
        return prev ? `${prev} ${transcript}` : transcript;
      }
      const start = Math.min(anchor.start, prev.length);
      const end = Math.min(anchor.end, prev.length);
      const left = prev.slice(0, start);
      const right = prev.slice(end);
      const needLeftSpace = left.length > 0 && !/\s$/.test(left);
      const needRightSpace = right.length > 0 && !/^\s/.test(right);
      const inserted = `${needLeftSpace ? ' ' : ''}${transcript}${needRightSpace ? ' ' : ''}`;
      opts.pendingCursorRef.current = start + inserted.length;
      return left + inserted + right;
    });
  }

  function currentAnchor(): { start: number; end: number; focused: boolean } {
    const ta = opts.textareaRef.current;
    const len = opts.getInput().length;
    return ta && document.activeElement === ta
      ? { start: ta.selectionStart ?? len, end: ta.selectionEnd ?? len, focused: true }
      : { start: len, end: len, focused: false };
  }

  function buildFailedAudio(
    audio: AudioFailedRecording,
    localReady: boolean | undefined,
  ): AudioFailedRecording & { localReady?: boolean } {
    return localReady === undefined ? { ...audio } : { ...audio, localReady };
  }

  function handleSuccess(outcome: Extract<AudioRecordOutcome, { ok: true }>): void {
    const anchor = cursorAtClickRef.current ?? {
      start: opts.getInput().length,
      end: opts.getInput().length,
      focused: false,
    };
    insertTranscriptAtCursor(outcome.result.transcript, anchor);
    setFailedAudio(null);
    if (outcome.result.provider === 'local-fallback') {
      setInfo('网络转写失败，已用本地模型转写');
    }
  }

  function handleFailure(outcome: Extract<AudioRecordOutcome, { ok: false }>): void {
    if (outcome.reason === 'cancel') return;
    opts.onMicError(outcome.message);
    if (outcome.reason === 'error' && outcome.lastAudio) {
      setFailedAudio(buildFailedAudio(outcome.lastAudio, outcome.localReady));
    }
  }

  async function handleMicClick(): Promise<void> {
    if (recording) return;
    cursorAtClickRef.current = currentAnchor();
    setRecording(true);
    try {
      if (opts.audioPassthrough && opts.audioPassthroughDeps) {
        const { profileId, addAttachment } = opts.audioPassthroughDeps;
        if (!profileId) {
          opts.onMicError('请先选中职业档案再录音');
          return;
        }
        const outcome = await window.muicv.audio.recordAndAttach({ profileId, durationLimitSec: 180 });
        if (outcome.ok) {
          addAttachment(outcome.ref);
          setInfo('已录入语音附件，直接发送让模型听原音（mimo-v2.6-flash 全模态）');
        } else if (outcome.reason !== 'cancel') {
          opts.onMicError(outcome.message);
        }
        return;
      }
      const outcome = await window.muicv.audio.recordAndTranscribe({ durationLimitSec: 180 });
      if (outcome.ok) handleSuccess(outcome);
      else handleFailure(outcome);
    } finally {
      setRecording(false);
    }
  }

  async function handleRetryTranscribe(): Promise<void> {
    if (!failedAudio || retryPending) return;
    setRetryPending(true);
    try {
      const outcome = await window.muicv.audio.retranscribe({
        wav: failedAudio.wav,
        mimeType: failedAudio.mimeType,
        durationMs: failedAudio.durationMs,
        pauses: failedAudio.pauses,
      });
      if (outcome.ok) {
        // 重试成功用此刻 textarea 光标位置插入（原 cursorAtClickRef 已过期）
        insertTranscriptAtCursor(outcome.result.transcript, currentAnchor());
        if (outcome.result.provider === 'local-fallback') {
          setInfo('网络转写失败，已用本地模型转写');
        }
        setFailedAudio(null);
      } else if (outcome.reason === 'error') {
        opts.onMicError(outcome.message);
        if (outcome.lastAudio) setFailedAudio(buildFailedAudio(outcome.lastAudio, outcome.localReady));
      }
    } finally {
      setRetryPending(false);
    }
  }

  function handleDownloadFailedAudio(): void {
    if (!failedAudio) return;
    // copy 一份字节进新 ArrayBuffer，避免 IPC 过来的 Uint8Array<ArrayBufferLike> 在 Blob 构造时被 TS 拒。
    const bytes = new Uint8Array(failedAudio.wav.byteLength);
    bytes.set(failedAudio.wav);
    const blob = new Blob([bytes], { type: failedAudio.mimeType || 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `muicv-recording-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    recording,
    failedAudio,
    retryPending,
    info,
    handleMicClick,
    handleRetryTranscribe,
    handleDownloadFailedAudio,
    clearFailedAudio: () => setFailedAudio(null),
    resetOnContextChange: () => {
      setFailedAudio(null);
      setInfo(null);
    },
  };
}
