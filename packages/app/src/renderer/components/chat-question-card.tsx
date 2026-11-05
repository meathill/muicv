import { Button } from '@muicv/ui';
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  PaperPlaneTiltIcon,
  ProhibitIcon,
  QuestionIcon,
  SpinnerGapIcon,
  SquareIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
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

const IS_MAC = /Mac/i.test(navigator.platform);

/* ---------- 工具函数 ---------- */

function parseQuestionInput(call: ToolCallRecord): ParsedQuestion {
  const raw = (typeof call.input === 'object' && call.input !== null ? call.input : {}) as AskQuestionInput;
  return {
    question: raw.question || '请确认以下信息：',
    options: Array.isArray(raw.options) ? raw.options : [],
    multiSelect: Boolean(raw.multiSelect),
  };
}

/* ---------- 问答记录小卡片 ---------- */

/**
 * 一轮问答的存档卡片：已答 / 等待中 / 已失效 共用同一版式，
 * 让每次交互在正文流里成为独立可辨识的块，而不是一行灰字。
 */
function QuestionRecordCard({ icon, question, children }: { icon: ReactNode; question: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-rule bg-fluff/60 px-3 py-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-relaxed text-ink">{question}</p>
          {children != null && <div className="mt-1 text-[14px] leading-relaxed">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function DoneQuestionRow({ call }: { call: ToolCallRecord }) {
  const { question } = parseQuestionInput(call);
  const answer = String(call.output ?? '').trim();
  return (
    <QuestionRecordCard
      icon={<CheckCircleIcon size={14} weight="fill" className="text-yellow-deep" />}
      question={question}
    >
      {answer && <p className="whitespace-pre-wrap border-l-2 border-yellow pl-2 text-ink-soft">{answer}</p>}
    </QuestionRecordCard>
  );
}

function ExpiredQuestionRow({ call, submitted }: { call: ToolCallRecord; submitted: boolean }) {
  const { question } = parseQuestionInput(call);
  return (
    <QuestionRecordCard icon={<ProhibitIcon size={14} weight="bold" className="text-mute" />} question={question}>
      <p className="text-mute">{submitted ? '回答已提交，但 AI 未返回结果。' : '提问已失效。'}</p>
    </QuestionRecordCard>
  );
}

function SubmittedQuestionRow({ call }: { call: ToolCallRecord }) {
  const { question } = parseQuestionInput(call);
  return (
    <QuestionRecordCard
      icon={<SpinnerGapIcon size={14} weight="bold" className="animate-spin text-yellow-deep" />}
      question={question}
    >
      <p className="text-mute">已提交，等待 AI 继续…</p>
    </QuestionRecordCard>
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
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-bold text-ink leading-relaxed">{question}</p>
        {multiSelect && (
          <span className="shrink-0 rounded bg-paper-deep px-1.5 font-mono text-xs font-bold text-mute">多选</span>
        )}
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <Button
                key={opt}
                aria-pressed={isChecked}
                onClick={() => onToggle(opt)}
                disabled={disabled}
                variant={isChecked ? 'press' : 'outline'}
                className="h-auto min-h-8 max-w-full whitespace-normal py-1 text-left"
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
              </Button>
            );
          })}
        </div>
      )}

      <textarea
        aria-label={options.length > 0 ? '其他或补充说明' : '你的回答'}
        value={customText}
        onChange={(e) => onCustomTextChange(e.target.value)}
        placeholder={options.length > 0 ? '其他或补充说明（可选）…' : '输入你的回答…'}
        disabled={disabled}
        rows={1}
        className="field-sizing-content max-h-[120px] min-h-8 w-full resize-none rounded-md border border-rule-strong bg-paper px-3 py-1.5 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />
    </div>
  );
}

/* ---------- 提问组：统一管理多个问题的回答和提交 ---------- */

export function ChatQuestionGroup({ calls, messageId }: { calls: ToolCallRecord[]; messageId: string }) {
  const isCurrentReply = useAppStore((s) => s.activeAssistantId === messageId);

  // 按完成状态分组
  const doneCalls = calls.filter((c) => c.output !== undefined);
  const pendingCalls = calls.filter((c) => c.output === undefined);

  // 每个 pending 问题独立的选择状态
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
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

  async function handleSubmit(selectionOverride?: Record<string, string[]>) {
    if (submitting || submitted) return;
    setError(null);
    setSubmitting(true);
    try {
      for (const call of pendingCalls) {
        const sel = selectionOverride?.[call.id] ?? getSelected(call.id);
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

  /**
   * 点选项：只有一个问题且是单选时，点击即提交进入下一步（输入框里的补充说明一并带上）；
   * 其余场景（多选题 / 多个问题）只记录选择，等用户显式提交。
   */
  function handleToggleOption(call: ToolCallRecord, opt: string) {
    const { multiSelect } = parseQuestionInput(call);
    if (!multiSelect && pendingCalls.length === 1) {
      setSelections((prev) => ({ ...prev, [call.id]: [opt] }));
      void handleSubmit({ [call.id]: [opt] });
      return;
    }
    toggleOption(call.id, opt, multiSelect);
  }

  /**
   * Cmd/Ctrl + Enter：和当前可见的主按钮保持一致——
   * 最后一题（含只有一个问题）提交，否则进入下一题。
   */
  // 结构化参数：React 合成事件类型缺 isComposing / keyCode，与 isChatSubmitHotkey 同款写法
  function handleCardKeyDown(e: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    isComposing?: boolean;
    keyCode?: number;
    preventDefault: () => void;
  }) {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
    if (e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    if (submitting || submitted) return;
    if (isLastQuestion) {
      void handleSubmit();
    } else {
      setQuestionIndex(currentIndex + 1);
    }
  }

  // 全部已完成 → 折叠行
  if (doneCalls.length === calls.length) {
    return (
      <div className="my-3 flex flex-col gap-1.5">
        {doneCalls.map((c) => (
          <DoneQuestionRow key={c.id} call={c} />
        ))}
      </div>
    );
  }

  // 没有活跃 run → 全部失效
  if (!isCurrentReply) {
    return (
      <div className="my-3 flex flex-col gap-1.5">
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
      <div className="my-3 flex flex-col gap-1.5">
        {doneCalls.map((c) => (
          <DoneQuestionRow key={c.id} call={c} />
        ))}
        {pendingCalls.map((c) => (
          <SubmittedQuestionRow key={c.id} call={c} />
        ))}
      </div>
    );
  }

  const currentIndex = Math.min(questionIndex, pendingCalls.length - 1);
  const current = pendingCalls[currentIndex];
  if (!current) return null;
  const isLastQuestion = currentIndex === pendingCalls.length - 1;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 快捷键挂在卡片容器上，textarea / 选项按钮聚焦时都能触发
    <div
      onKeyDown={handleCardKeyDown}
      className="my-3 flex flex-col gap-4 rounded-xl border-2 border-ink bg-cream p-4 text-ink shadow-[0_3px_0_0_var(--color-ink)] animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-ink bg-yellow text-ink shadow-[0_1px_0_0_var(--color-ink)]">
          <QuestionIcon size={16} weight="bold" />
        </span>
        <span className="flex-1 text-xs font-bold text-ink">AI 正在提问</span>
        {pendingCalls.length > 1 && (
          <span aria-live="polite" className="text-xs tabular-nums text-mute">
            第 {currentIndex + 1} / {pendingCalls.length} 题
          </span>
        )}
      </div>

      {/* 已完成的问题（记录卡片） */}
      {doneCalls.length > 0 && (
        <div className="flex flex-col gap-1.5 border-b border-rule pb-3">
          {doneCalls.map((c) => (
            <DoneQuestionRow key={c.id} call={c} />
          ))}
        </div>
      )}

      <QuestionItem
        key={current.id}
        call={current}
        selected={getSelected(current.id)}
        onToggle={(opt) => handleToggleOption(current, opt)}
        customText={getCustomText(current.id)}
        onCustomTextChange={(text) => setCustomText(current.id, text)}
        disabled={submitting}
      />

      {error && <p className="text-[12px] font-bold text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {pendingCalls.length > 1 && (
          <Button
            onClick={() => setQuestionIndex(currentIndex - 1)}
            disabled={currentIndex === 0 || submitting}
            variant="ghost"
          >
            <CaretLeftIcon />
            上一题
          </Button>
        )}
        {isLastQuestion ? (
          <>
            <span className="self-center font-mono text-[12px] text-mute" title="快捷键提交">
              {IS_MAC ? '⌘↩' : 'Ctrl+↩'}
            </span>
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit || submitting}
              variant="press"
              className="disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? <SpinnerGapIcon className="animate-spin" /> : <PaperPlaneTiltIcon weight="bold" />}
              {submitting ? '提交中…' : '提交回答'}
            </Button>
          </>
        ) : (
          <Button onClick={() => setQuestionIndex(currentIndex + 1)} disabled={submitting} variant="outline">
            下一题
            <CaretRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
