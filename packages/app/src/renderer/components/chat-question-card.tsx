import {
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  PaperPlaneTiltIcon,
  ProhibitIcon,
  QuestionIcon,
  SpinnerGapIcon,
  SquareIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import type { ToolCallRecord } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';

type AskQuestionInput = {
  question?: string;
  options?: string[];
  multiSelect?: boolean;
};

export function ChatQuestionCard({ call }: { call: ToolCallRecord }) {
  const isDone = call.output !== undefined;
  // 提问只在「当前有活跃 run」时才能被回答：中断/关闭后重载的历史里，
  // 未回答的 ask_question 仍会留在落盘记录里，但主进程已没有对应 pending，
  // 此时提交只会拿到 false，必须让卡片失效而不是让用户白点。
  const activeChannel = useAppStore((s) => s.activeChannel);
  const hasActiveRun = activeChannel !== null;

  const rawInput = (typeof call.input === 'object' && call.input !== null ? call.input : {}) as AskQuestionInput;

  const question = rawInput.question || '请确认以下信息：';
  const options = Array.isArray(rawInput.options) ? rawInput.options : [];
  const multiSelect = Boolean(rawInput.multiSelect);

  const [selected, setSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSelection = selected.length > 0;
  const hasText = customText.trim().length > 0;
  const canSubmit = hasSelection || hasText || options.length === 0;

  function toggleOption(opt: string) {
    if (multiSelect) {
      setSelected((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
    } else {
      setSelected((prev) => (prev.includes(opt) ? [] : [opt]));
    }
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    setError(null);
    setSubmitting(true);
    try {
      const answerPayload = {
        answer: multiSelect ? selected : (selected[0] ?? ''),
        customText: customText.trim() || undefined,
      };
      const accepted = await window.muicv.agent.answerQuestion(call.id, answerPayload);
      if (!accepted) {
        // 主进程没有对应 pending：run 已结束 / 已中止，或这条是重载出来的历史
        setError('这条提问已经失效（对话已中断或重新打开），请重新发送消息。');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <div className="rounded-xl border-2 border-rule-strong bg-paper/60 p-3 text-[13px] text-ink-soft">
        <div className="flex items-center gap-2 font-bold text-ink">
          <CheckCircleIcon size={16} weight="fill" className="text-yellow-deep" />
          <span>提问已回答</span>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink">{question}</p>
        <div className="mt-2 rounded-md border border-rule bg-cream/80 px-2.5 py-1.5 font-mono text-[12px] text-ink">
          {String(call.output)}
        </div>
      </div>
    );
  }

  // 没有活跃 run：历史里未回答的提问，或已提交但 run 中断没能回结果
  if (!hasActiveRun) {
    return (
      <div className="rounded-xl border-2 border-rule-strong bg-paper/60 p-3 text-[13px] text-ink-soft">
        <div className="flex items-center gap-2 font-bold text-mute">
          <ProhibitIcon size={16} weight="bold" />
          <span>提问已失效</span>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink">{question}</p>
        <p className="mt-1 text-[12px]">
          {submitted ? '回答已提交，但 AI 未返回结果（对话已中断）。' : '这段对话已中断或重新打开，请重新发送消息。'}
        </p>
      </div>
    );
  }

  // 已提交、等待 AI 继续。不依赖 tool-output 事件必达，避免卡在"提交中…"。
  if (submitted) {
    return (
      <div className="rounded-xl border-2 border-ink bg-cream p-3 text-[13px] text-ink shadow-[0_2px_0_0_var(--color-ink)]">
        <div className="flex items-center gap-2 font-bold text-ink">
          <SpinnerGapIcon size={16} weight="bold" className="animate-spin text-yellow-deep" />
          <span>已提交回答，等待 AI 继续…</span>
        </div>
        <p className="mt-1 text-[13px] font-semibold text-ink">{question}</p>
      </div>
    );
  }

  return (
    <div className="my-2 flex flex-col gap-3 rounded-xl border-2 border-ink bg-cream p-4 text-ink shadow-[0_3px_0_0_var(--color-ink)] animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-ink shadow-[0_1px_0_0_var(--color-ink)]">
          <QuestionIcon size={16} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-yellow-deep">AI 正在提问</span>
            {multiSelect && (
              <span className="rounded bg-paper-deep px-1.5 py-0.2 font-mono text-[10px] font-bold text-mute">
                多选
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[14px] font-bold text-ink leading-relaxed">{question}</p>
        </div>
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleOption(opt)}
                disabled={submitting}
                className={`press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${
                  isChecked
                    ? 'border-2 border-ink bg-yellow text-ink shadow-[0_2px_0_0_var(--color-ink)]'
                    : 'border-2 border-rule bg-paper text-ink-soft hover:border-rule-strong hover:bg-paper-deep'
                }`}
              >
                {multiSelect ? (
                  isChecked ? (
                    <CheckSquareIcon size={15} weight="fill" className="text-ink" />
                  ) : (
                    <SquareIcon size={15} className="text-mute" />
                  )
                ) : isChecked ? (
                  <CheckCircleIcon size={15} weight="fill" className="text-ink" />
                ) : (
                  <CircleIcon size={15} className="text-mute" />
                )}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={options.length > 0 ? '其他或补充说明（可选）…' : '输入你的回答…'}
          disabled={submitting}
          className="w-full rounded-lg border-2 border-rule-strong bg-paper px-3 py-1.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
        />

        {error && <p className="text-[12px] font-bold text-danger">{error}</p>}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || submitting}
            className="press inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-yellow px-4 py-1.5 text-[13px] font-bold text-ink shadow-[0_2px_0_0_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <SpinnerGapIcon size={15} className="animate-spin" />
                <span>提交中…</span>
              </>
            ) : (
              <>
                <PaperPlaneTiltIcon size={15} weight="bold" />
                <span>提交回答</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
