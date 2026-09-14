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
import { useRef, useState } from 'react';
import type { ToolCallRecord } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';

type AskQuestionInput = {
  question?: string;
  options?: string[];
  multiSelect?: boolean;
};

type ParsedQuestion = {
  question: string;
  options: string[];
  multiSelect: boolean;
};

/* ---------- 工具函数 ---------- */

function parseQuestionInput(call: ToolCallRecord): ParsedQuestion {
  const raw = (typeof call.input === 'object' && call.input !== null ? call.input : {}) as AskQuestionInput;
  return {
    question: raw.question || '请确认以下信息：',
    options: Array.isArray(raw.options) ? raw.options : [],
    multiSelect: Boolean(raw.multiSelect),
  };
}

/** 从 tool output 提取回答摘要文本 */
function summarizeAnswer(output: unknown): string {
  const text = String(output ?? '');
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

/* ---------- 已完成 / 已失效 的折叠行 ---------- */

function DoneQuestionRow({ call }: { call: ToolCallRecord }) {
  const { question } = parseQuestionInput(call);
  return (
    <div className="flex items-start gap-1.5 text-[12px] text-mute leading-relaxed">
      <CheckCircleIcon size={13} weight="fill" className="mt-0.5 shrink-0 text-yellow-deep" />
      <span className="min-w-0">
        <span className="font-bold text-ink-soft">{question}</span>
        <span className="ml-1.5 text-mute">{summarizeAnswer(call.output)}</span>
      </span>
    </div>
  );
}

function ExpiredQuestionRow({ call, submitted }: { call: ToolCallRecord; submitted: boolean }) {
  const { question } = parseQuestionInput(call);
  return (
    <div className="flex items-start gap-1.5 text-[12px] text-mute leading-relaxed">
      <ProhibitIcon size={13} weight="bold" className="mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="font-bold">{question}</span>
        <span className="ml-1.5">{submitted ? '回答已提交，但 AI 未返回结果。' : '提问已失效。'}</span>
      </span>
    </div>
  );
}

function SubmittedQuestionRow({ call }: { call: ToolCallRecord }) {
  const { question } = parseQuestionInput(call);
  return (
    <div className="flex items-start gap-1.5 text-[12px] text-ink-soft leading-relaxed">
      <SpinnerGapIcon size={13} weight="bold" className="mt-0.5 shrink-0 animate-spin text-yellow-deep" />
      <span className="min-w-0">
        <span className="font-bold text-ink">{question}</span>
        <span className="ml-1.5 text-mute">等待 AI 继续…</span>
      </span>
    </div>
  );
}

/* ---------- 单个问题的选项 / 输入 ---------- */

function QuestionItem({
  call,
  selected,
  onToggle,
  customText,
  onCustomTextChange,
  disabled,
}: {
  call: ToolCallRecord;
  selected: string[];
  onToggle: (opt: string) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
  disabled: boolean;
}) {
  const { question, options, multiSelect } = parseQuestionInput(call);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleTextareaInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-bold text-ink leading-relaxed">{question}</p>
        {multiSelect && (
          <span className="rounded bg-paper-deep px-1.5 py-0.2 font-mono text-[10px] font-bold text-mute">多选</span>
        )}
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                disabled={disabled}
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

      <textarea
        ref={textareaRef}
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        onInput={handleTextareaInput}
        placeholder={options.length > 0 ? '其他或补充说明（可选）…' : '输入你的回答…'}
        disabled={disabled}
        rows={1}
        className="w-full resize-none rounded-lg border-2 border-rule-strong bg-paper px-3 py-1.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />
    </div>
  );
}

/* ---------- 提问组：统一管理多个问题的回答和提交 ---------- */

export function ChatQuestionGroup({ calls }: { calls: ToolCallRecord[] }) {
  const activeChannel = useAppStore((s) => s.activeChannel);
  const hasActiveRun = activeChannel !== null;

  // 按完成状态分组
  const doneCalls = calls.filter((c) => c.output !== undefined);
  const pendingCalls = calls.filter((c) => c.output === undefined);

  // 每个 pending 问题独立的选择状态
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getSelected(callId: string): string[] {
    return selections[callId] ?? [];
  }

  function toggleOption(callId: string, opt: string, multiSelect: boolean) {
    setSelections((prev) => {
      const current = prev[callId] ?? [];
      if (multiSelect) {
        return { ...prev, [callId]: current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt] };
      }
      return { ...prev, [callId]: current.includes(opt) ? [] : [opt] };
    });
  }

  function getCustomText(callId: string): string {
    return customTexts[callId] ?? '';
  }

  function setCustomText(callId: string, text: string) {
    setCustomTexts((prev) => ({ ...prev, [callId]: text }));
  }

  // 至少有一个问题有选择或输入
  const canSubmit = pendingCalls.some((c) => {
    const sel = getSelected(c.id);
    const txt = getCustomText(c.id).trim();
    const opts = parseQuestionInput(c).options ?? [];
    return sel.length > 0 || txt.length > 0 || opts.length === 0;
  });

  async function handleSubmit() {
    if (submitting || submitted) return;
    setError(null);
    setSubmitting(true);
    try {
      for (const call of pendingCalls) {
        const sel = getSelected(call.id);
        const txt = getCustomText(call.id).trim();
        const { multiSelect } = parseQuestionInput(call);
        const answerPayload = {
          answer: multiSelect ? sel : (sel[0] ?? ''),
          customText: txt || undefined,
        };
        const accepted = await window.muicv.agent.answerQuestion(call.id, answerPayload);
        if (!accepted) {
          setError('这条提问已经失效（对话已中断或重新打开），请重新发送消息。');
          setSubmitting(false);
          return;
        }
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  // 全部已完成 → 折叠行
  if (doneCalls.length === calls.length) {
    return (
      <div className="space-y-1">
        {doneCalls.map((c) => (
          <DoneQuestionRow key={c.id} call={c} />
        ))}
      </div>
    );
  }

  // 没有活跃 run → 全部失效
  if (!hasActiveRun) {
    return (
      <div className="space-y-1">
        {doneCalls.map((c) => (
          <DoneQuestionRow key={c.id} call={c} />
        ))}
        {pendingCalls.map((c) => (
          <ExpiredQuestionRow key={c.id} call={c} submitted={submitted} />
        ))}
      </div>
    );
  }

  // 已提交等待 AI 继续
  if (submitted) {
    return (
      <div className="space-y-1">
        {doneCalls.map((c) => (
          <DoneQuestionRow key={c.id} call={c} />
        ))}
        {pendingCalls.map((c) => (
          <SubmittedQuestionRow key={c.id} call={c} />
        ))}
      </div>
    );
  }

  // 活跃状态：展示问题 + 统一提交按钮
  return (
    <div className="my-2 flex flex-col gap-4 rounded-xl border-2 border-ink bg-cream p-4 text-ink shadow-[0_3px_0_0_var(--color-ink)] animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-ink shadow-[0_1px_0_0_var(--color-ink)]">
          <QuestionIcon size={16} weight="bold" />
        </span>
        <span className="text-[12px] font-bold text-yellow-deep">
          AI 正在提问{pendingCalls.length > 1 ? `（${pendingCalls.length} 个问题）` : ''}
        </span>
      </div>

      {/* 已完成的问题（折叠行） */}
      {doneCalls.length > 0 && (
        <div className="space-y-1 border-b border-rule pb-3">
          {doneCalls.map((c) => (
            <DoneQuestionRow key={c.id} call={c} />
          ))}
        </div>
      )}

      {/* 待回答的问题 */}
      <div className="flex flex-col gap-4">
        {pendingCalls.map((c) => (
          <QuestionItem
            key={c.id}
            call={c}
            selected={getSelected(c.id)}
            onToggle={(opt) => toggleOption(c.id, opt, Boolean(parseQuestionInput(c).multiSelect))}
            customText={getCustomText(c.id)}
            onCustomTextChange={(text) => setCustomText(c.id, text)}
            disabled={submitting}
          />
        ))}
      </div>

      {error && <p className="text-[12px] font-bold text-danger">{error}</p>}

      <div className="flex justify-end">
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
  );
}
