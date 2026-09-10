import {
  ArrowCounterClockwiseIcon,
  BrainIcon,
  CheckIcon,
  FileTextIcon,
  GearIcon,
  HourglassIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { ArtifactRef, AttachmentRef, ChatMessageFeedback, ToolCallRecord } from '../../shared/types.ts';
import { ArtifactCard } from './artifact-card';
import { AttachmentChip } from './chat-attachment-chip';
import { MessageFeedbackBar } from './chat-message-feedback';
import { ChatQuestionCard } from './chat-question-card';
import { stripAttachmentFooter } from './chat-utils';
import { ConfirmDialog } from './confirm-dialog';
import { ForkConversationDialog } from './fork-conversation-dialog';
import { MarkdownView } from './markdown-view';

export function MessageBubble({
  messageId,
  conversationId,
  conversationTitle,
  role,
  content,
  reasoning,
  attachments,
  toolCalls,
  artifacts,
  feedback,
  onOpenArtifact,
  onPreviewAttachment,
  onPathClick,
  onFork,
  onRollback,
}: {
  messageId: string;
  conversationId: string;
  conversationTitle?: string | undefined;
  role: string;
  content: string;
  reasoning?: string | undefined;
  attachments?: AttachmentRef[] | undefined;
  toolCalls?: ToolCallRecord[] | undefined;
  artifacts?: ArtifactRef[] | undefined;
  feedback?: ChatMessageFeedback | undefined;
  onOpenArtifact: (a: ArtifactRef) => void;
  onPreviewAttachment?: (a: AttachmentRef) => void;
  onPathClick?: (path: string) => void;
  onFork?: ((messageId: string, title: string) => void) | undefined;
  onRollback?: ((messageId: string) => void) | undefined;
}) {
  const [showForkDialog, setShowForkDialog] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);

  const isUser = role === 'user';
  const displayContent = isUser ? stripAttachmentFooter(content) : content;

  // 工件按 source 分两类：read = 过程参考资料（折叠到操作组里）/ write = 最终产物（显眼卡片）
  const readRefs = artifacts?.filter((a) => a.source === 'read') ?? [];
  const writeRefs = artifacts?.filter((a) => a.source === 'write') ?? [];

  // 工具调用分离：普通工具收进 OpsGroup，ask_question 单独作为交互卡片突出展示
  const questionCalls = toolCalls?.filter((c) => c.name === 'ask_question') ?? [];
  const regularToolCalls = toolCalls?.filter((c) => c.name !== 'ask_question') ?? [];

  const hasOps = regularToolCalls.length > 0 || readRefs.length > 0;
  const hasQuestions = questionCalls.length > 0;
  const hasAttachments = (attachments?.length ?? 0) > 0;
  const hasReasoning = !!reasoning && reasoning.length > 0;
  const empty =
    !displayContent && !hasOps && !hasQuestions && !hasAttachments && writeRefs.length === 0 && !hasReasoning;
  // 流式中（content 还在累加 / inflight tool）不显示反馈条；
  // 等流式完成、有实际文本后再让用户评价。
  const showFeedback = !isUser && !empty && content.length > 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`w-full select-text space-y-2 rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
            isUser
              ? 'border-2 border-ink bg-yellow text-ink selection:bg-ink selection:text-cream dark:selection:bg-[#1a1410] dark:selection:text-[#fdfaf2]'
              : 'border-2 border-rule bg-paper text-ink-soft'
          }`}
        >
          {!isUser && hasOps && <OpsGroup toolCalls={regularToolCalls} reads={readRefs} />}

          {!isUser && reasoning && reasoning.length > 0 && (
            <ReasoningBlock text={reasoning} streaming={!displayContent} />
          )}

          {displayContent &&
            (isUser ? (
              <div className="whitespace-pre-wrap">{displayContent}</div>
            ) : (
              <MarkdownView source={displayContent} className="text-ink-soft" onPathClick={onPathClick} />
            ))}

          {hasQuestions && (
            <div className="space-y-2 pt-1">
              {questionCalls.map((q) => (
                <ChatQuestionCard key={q.id} call={q} />
              ))}
            </div>
          )}

          {hasAttachments && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {attachments?.map((a) =>
                onPreviewAttachment ? (
                  <AttachmentChip key={a.path} attachment={a} onPreview={() => onPreviewAttachment(a)} />
                ) : (
                  <AttachmentChip key={a.path} attachment={a} />
                ),
              )}
            </div>
          )}

          {empty && (
            <span className="inline-flex items-center gap-2 text-mute">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow" />
              思考中…
            </span>
          )}

          {writeRefs.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {writeRefs.map((a, i) => (
                <ArtifactCard key={`${a.path}-${i}`} artifact={a} onOpen={() => onOpenArtifact(a)} />
              ))}
            </div>
          )}
        </div>

        {showFeedback && (
          <div className="mt-1 self-stretch px-1">
            <MessageFeedbackBar
              messageId={messageId}
              conversationId={conversationId}
              text={displayContent}
              feedback={feedback}
              onFork={onFork ? () => setShowForkDialog(true) : undefined}
            />
          </div>
        )}

        {isUser && onRollback && (
          <div className="mt-1 flex items-center justify-end px-1 opacity-75 hover:opacity-100 transition-opacity">
            <button
              type="button"
              title="回滚到此发言并重新编辑"
              aria-label="回滚到此发言并重新编辑"
              onClick={() => setShowRollbackConfirm(true)}
              className="press inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-mute hover:bg-rule/40 hover:text-ink"
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" />
              <span>回滚重新编辑</span>
            </button>
          </div>
        )}

        {showForkDialog && (
          <ForkConversationDialog
            open={showForkDialog}
            defaultTitle={conversationTitle ? `${conversationTitle} (分支)` : '分支对话'}
            onConfirm={(title) => {
              setShowForkDialog(false);
              onFork?.(messageId, title);
            }}
            onCancel={() => setShowForkDialog(false)}
          />
        )}

        {showRollbackConfirm && (
          <ConfirmDialog
            open={showRollbackConfirm}
            title="确认回滚到此发言？"
            description="此操作将回到该对话阶段，截断此发言及其之后的所有消息，并将当时的内容与附件填回输入框供你修改后重新发送。"
            confirmLabel="回滚并编辑"
            cancelLabel="取消"
            destructive
            onConfirm={() => {
              setShowRollbackConfirm(false);
              onRollback?.(messageId);
            }}
            onCancel={() => setShowRollbackConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * thinking-mode 模型（mimo / DeepSeek 系）的推理过程展示。
 *
 *   - streaming=true（最终回复未开始）：默认展开 + 跟随滚动，让用户看到模型当下在想什么，
 *     替代之前固定的"思考中…"——多轮深思考时能确认 agent 仍在工作而非卡死
 *   - streaming=false（已开始/完成最终回复）：默认收起，避免抢戏
 */
function ReasoningBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(streaming);
  const bodyRef = useRef<HTMLDivElement>(null);

  // streaming 期间 text 增长时滚到底部，保持最新思考可见
  useEffect(() => {
    if (streaming && open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [text, streaming, open]);

  // 从 streaming → 完成时自动收起，让位给最终内容
  useEffect(() => {
    if (!streaming) setOpen(false);
  }, [streaming]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-rule bg-fluff/50"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-[12px] text-mute">
        <BrainIcon
          size={12}
          weight="fill"
          className={streaming ? 'shrink-0 animate-pulse text-yellow-deep' : 'shrink-0 text-yellow-deep'}
        />
        <span className="flex-1 truncate">{streaming ? '思考中…' : `思考过程 · ${text.length} 字`}</span>
        <span className="text-[12px]">{open ? '收起' : '展开'}</span>
      </summary>
      <div
        ref={bodyRef}
        className="max-h-48 overflow-auto border-t border-rule px-2.5 py-2 text-[12px] leading-relaxed text-mute"
      >
        <div className="whitespace-pre-wrap font-mono text-[12px]">{text}</div>
      </div>
    </details>
  );
}

/**
 * 把 agent 的工具调用 + 读取过的参考资料聚合成一张折叠卡片，默认收起。
 * Header 只显示"调用了 N 个工具 / 读了 M 个文件"，点开看每条详情。
 * 减少噪音，让用户聚焦在最终输出 + 产物上。
 */
function OpsGroup({ toolCalls, reads }: { toolCalls: ToolCallRecord[]; reads: ArtifactRef[] }) {
  const [open, setOpen] = useState(false);
  const inflight = toolCalls.find((c) => c.output === undefined);
  const summary = inflight ? `正在 ${inflight.name}…` : `调用了 ${toolCalls.length} 个工具`;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-rule bg-fluff/50"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 text-[12px] text-mute">
        <GearIcon
          size={12}
          weight="fill"
          className={inflight ? 'shrink-0 animate-spin text-yellow-deep' : 'shrink-0 text-yellow-deep'}
        />
        <span className="flex-1 truncate font-mono">{summary}</span>
        <span className="text-[12px]">{open ? '收起' : '展开'}</span>
      </summary>
      <div className="space-y-1 border-t border-rule px-2 py-2">
        {toolCalls.map((c) => (
          <ToolCallChip key={c.id} call={c} />
        ))}
        {reads.length > 0 && (
          <div className="mt-2 border-t border-rule pt-2">
            <p className="mb-1 px-1 text-[12px] text-mute">参考的素材：</p>
            <ul className="space-y-0.5">
              {reads.map((r, i) => (
                <li key={`${r.path}-${i}`} className="flex items-center gap-1 px-1 font-mono text-[12px] text-ink-soft">
                  <FileTextIcon size={11} className="shrink-0 text-mute" />
                  <span className="truncate">{r.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function ToolCallChip({ call }: { call: ToolCallRecord }) {
  const [open, setOpen] = useState(false);
  const done = call.output !== undefined;
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-rule bg-fluff/70"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 font-mono text-[12px]">
        {done ? (
          <CheckIcon size={12} weight="bold" className="shrink-0 text-yellow-deep" />
        ) : (
          <HourglassIcon size={12} className="shrink-0 animate-pulse text-mute" />
        )}
        <span className="font-bold text-ink">{call.name}</span>
        <span className="truncate text-mute">{previewArgs(call.input)}</span>
      </summary>
      <div className="border-t border-rule px-2.5 py-2 font-mono text-[12px] leading-snug text-ink-soft">
        <div>
          <span className="text-mute">input:</span>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-ink">
            {JSON.stringify(call.input, null, 2)}
          </pre>
        </div>
        {done && (
          <div className="mt-2">
            <span className="text-mute">output:</span>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap text-ink">{String(call.output)}</pre>
          </div>
        )}
      </div>
    </details>
  );
}

function previewArgs(input: unknown): string {
  if (input === null || input === undefined) return '';
  try {
    const s = typeof input === 'string' ? input : JSON.stringify(input);
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
  } catch {
    return '';
  }
}
