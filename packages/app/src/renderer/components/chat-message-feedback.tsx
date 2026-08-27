import {
  ChatCircleIcon,
  CircleNotchIcon,
  PaperPlaneTiltIcon,
  SpeakerHighIcon,
  SquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import {
  FEEDBACK_COMMENT_MAX_CHARS,
  FEEDBACK_COMMENT_MIN_CHARS,
  FEEDBACK_COMMENT_REWARD,
  FEEDBACK_RATING_REWARD,
  TTS_MAX_TEXT_CHARS,
} from '@muicv/shared';

import type { ChatMessageFeedback } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';

/**
 * 一条 AI 消息底部的反馈条：赞 / 踩 / 意见建议。
 *
 * 触发奖励的契约：
 *   - 赞 / 踩首次（这条消息从未评分过）→ +1000 显示 token
 *   - 切换 praise ↔ dislike → 状态更新但不再发奖
 *   - 意见建议 ≥ FEEDBACK_COMMENT_MIN_CHARS 字 → +50_000 显示 token，不限次数
 *   - 意见建议 < 50 字 → 仍然提交保存，但不发奖
 *
 * 服务端是 source of truth，本地 feedback 缓存只用于按钮选中态恢复（重启 / 切对话回来）。
 * 组件本身不持久化奖励金额——飘字动画结束后只剩按钮选中态。
 */
export function MessageFeedbackBar({
  messageId,
  conversationId,
  text,
  feedback,
}: {
  messageId: string;
  conversationId: string;
  /** 本条 AI 消息的纯文本（去掉附件 footer 后），朗读用。 */
  text: string;
  feedback?: ChatMessageFeedback | undefined;
}) {
  const session = useAppStore((s) => s.session);
  const patchMessageFeedback = useAppStore((s) => s.patchMessageFeedback);
  const applyBalance = useAppStore((s) => s.applyBalance);

  // 飘字动画队列：每次奖励触发 push 一项，900ms 后从队列移除。
  // 用 timestamp 当 key，并发触发也不会冲突。
  const [floats, setFloats] = useState<Array<{ id: number; amount: number }>>([]);
  const [busy, setBusy] = useState<'rate' | 'comment' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCommentBox, setShowCommentBox] = useState(false);
  const [draft, setDraft] = useState('');

  // 朗读状态机：idle → 合成中(loading) → 播放中(playing)；组件卸载 / 重合成都停掉当前音频
  const [speech, setSpeech] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const rating = feedback?.rating;
  const noKey = !session;
  const disabled = noKey || busy !== null;

  function spawnFloat(amount: number): void {
    const id = Date.now() + Math.random();
    setFloats((arr) => [...arr, { id, amount }]);
    setTimeout(() => {
      setFloats((arr) => arr.filter((f) => f.id !== id));
    }, 950);
  }

  async function handleRate(next: 'praise' | 'dislike'): Promise<void> {
    if (disabled) return;
    setError(null);
    // 乐观更新：先把按钮态切了
    patchMessageFeedback(messageId, { rating: next });
    setBusy('rate');
    try {
      const result = await window.muicv.feedback.rate({ messageId, conversationId, rating: next });
      if (result.ok) {
        applyBalance(result.data.balance);
        if (result.data.awarded > 0) spawnFloat(result.data.awarded);
      } else {
        // 鉴权 / 网络失败：rollback 选中态
        patchMessageFeedback(messageId, { rating: rating });
        setError(result.message);
      }
    } finally {
      setBusy(null);
    }
  }

  function stopSpeech(): void {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeech('idle');
  }

  async function handleSpeak(): Promise<void> {
    if (noKey || speech === 'loading') return;
    if (speech === 'playing') {
      stopSpeech();
      return;
    }
    setError(null);
    setSpeech('loading');
    try {
      // 服务端上限 TTS_MAX_TEXT_CHARS，长文客户端先截断，避免白白扣费后 400
      const result = await window.muicv.speech.speak(text.slice(0, TTS_MAX_TEXT_CHARS));
      if (!result.ok) {
        setError(result.message);
        setSpeech('idle');
        return;
      }
      const audio = new Audio(`data:audio/wav;base64,${result.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpeech('idle');
      audio.onerror = () => {
        setSpeech('idle');
        setError('音频播放失败');
      };
      await audio.play();
      setSpeech('playing');
    } catch (err) {
      setSpeech('idle');
      setError(err instanceof Error ? err.message : '朗读失败');
    }
  }

  async function handleSubmitComment(): Promise<void> {
    if (disabled) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setError(null);
    setBusy('comment');
    try {
      const result = await window.muicv.feedback.comment({ messageId, conversationId, text: trimmed });
      if (result.ok) {
        applyBalance(result.data.balance);
        if (result.data.awarded > 0) {
          spawnFloat(result.data.awarded);
          patchMessageFeedback(messageId, { rewardedComment: true });
        }
        setDraft('');
        setShowCommentBox(false);
      } else {
        setError(result.message);
      }
    } finally {
      setBusy(null);
    }
  }

  const charCount = countCodePoints(draft.trim());
  const tooLong = charCount > FEEDBACK_COMMENT_MAX_CHARS;
  const remaining = FEEDBACK_COMMENT_MIN_CHARS - charCount;

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-mute">
        <RatingButton
          label="赞"
          active={rating === 'praise'}
          disabled={disabled}
          onClick={() => void handleRate('praise')}
        >
          <ThumbsUpIcon size={14} weight={rating === 'praise' ? 'fill' : 'regular'} />
        </RatingButton>
        <RatingButton
          label="踩"
          active={rating === 'dislike'}
          disabled={disabled}
          onClick={() => void handleRate('dislike')}
        >
          <ThumbsDownIcon size={14} weight={rating === 'dislike' ? 'fill' : 'regular'} />
        </RatingButton>
        <RatingButton
          label="意见建议"
          active={showCommentBox}
          disabled={noKey}
          onClick={() => {
            setShowCommentBox((v) => !v);
            setError(null);
          }}
        >
          <ChatCircleIcon size={14} weight={showCommentBox ? 'fill' : 'regular'} />
        </RatingButton>
        <RatingButton
          label={speech === 'playing' ? '停止朗读' : '朗读'}
          active={speech !== 'idle'}
          disabled={disabled}
          onClick={() => void handleSpeak()}
        >
          {speech === 'loading' ? (
            <CircleNotchIcon size={14} className="animate-spin" />
          ) : speech === 'playing' ? (
            <SquareIcon size={12} weight="fill" />
          ) : (
            <SpeakerHighIcon size={14} />
          )}
        </RatingButton>

        {floats.map((f) => (
          <span key={f.id} className="feedback-float">
            +{f.amount.toLocaleString('en-US')}
          </span>
        ))}

        {noKey && <span className="ml-1 text-[12px] text-mute">登录后可反馈</span>}
      </div>

      {showCommentBox && (
        <div className="rounded-md border border-rule bg-fluff/40 p-2">
          <textarea
            className="block w-full resize-none rounded-sm border border-rule bg-paper px-2 py-1.5 text-[14px] leading-relaxed text-ink outline-none focus:border-yellow-deep"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`聊聊这条回答哪里好 / 哪里坑？≥${FEEDBACK_COMMENT_MIN_CHARS} 字奖励 ${FEEDBACK_COMMENT_REWARD.toLocaleString('en-US')} token`}
            maxLength={FEEDBACK_COMMENT_MAX_CHARS + 50}
          />
          <div className="mt-1.5 flex items-center justify-between text-[12px]">
            <span className={tooLong ? 'text-tongue' : remaining > 0 ? 'text-mute' : 'text-yellow-deep'}>
              {tooLong
                ? `太长了，最多 ${FEEDBACK_COMMENT_MAX_CHARS} 字`
                : remaining > 0
                  ? `${charCount} / ${FEEDBACK_COMMENT_MIN_CHARS} 字（再写 ${remaining} 字就奖励 ${FEEDBACK_COMMENT_REWARD.toLocaleString('en-US')} token）`
                  : `${charCount} 字 · 提交可领 ${FEEDBACK_COMMENT_REWARD.toLocaleString('en-US')} token`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[12px] text-mute hover:text-ink"
                onClick={() => {
                  setShowCommentBox(false);
                  setDraft('');
                  setError(null);
                }}
              >
                <XIcon size={12} />
                取消
              </button>
              <button
                type="button"
                className="inline-flex h-6 items-center gap-1 rounded-sm bg-yellow px-2 text-[12px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy !== null || tooLong || charCount === 0}
                onClick={() => void handleSubmitComment()}
              >
                <PaperPlaneTiltIcon size={12} weight="fill" />
                {busy === 'comment' ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <span className="text-[12px] text-tongue">反馈失败：{error}</span>}
    </div>
  );
}

function RatingButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={
        active ? `已${label}` : `${label}（首次赞/踩奖励 ${FEEDBACK_RATING_REWARD.toLocaleString('en-US')} token）`
      }
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-[12px] transition-colors ${
        active ? 'text-yellow-deep' : 'text-mute hover:text-ink'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function countCodePoints(text: string): number {
  return Array.from(text).length;
}
