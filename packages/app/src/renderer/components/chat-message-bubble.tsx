import { BrainIcon, CheckIcon, FileTextIcon, GearIcon, HourglassIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { ArtifactRef, AttachmentRef, ChatMessageFeedback, ToolCallRecord } from '../../shared/types.ts';
import { ArtifactCard } from './artifact-card';
import { AttachmentChip } from './chat-attachment-chip';
import { MessageFeedbackBar } from './chat-message-feedback';
import { MarkdownView } from './markdown-view';

/**
 * formatAttachmentsFooter 在每条带附件的 user message content 末尾追加
 * `\n\n---\n[附件]\n...`，agent 端拿到后能 read_file。
 *
 * 但 UI 层显示这一段是冗余 + 难看：用户已经能从下方的 AttachmentChip 看到
 * 文件名 + 预览，再读一遍灰色路径毫无意义。这里按 marker 把 footer 砍掉，
 * 持久化数据本身不动——agent 那边的 input 仍然带 footer。
 */
const ATTACHMENT_FOOTER_MARKER = '\n\n---\n[附件]\n';
function stripAttachmentFooter(content: string): string {
  const idx = content.indexOf(ATTACHMENT_FOOTER_MARKER);
  return idx === -1 ? content : content.slice(0, idx);
}

export function MessageBubble({
  messageId,
  conversationId,
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
}: {
  messageId: string;
  conversationId: string;
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
}) {
  const isUser = role === 'user';
  const displayContent = isUser ? stripAttachmentFooter(content) : content;
  // 工件按 source 分两类：read = 过程参考资料（折叠到操作组里）/ write = 最终产物（显眼卡片）
  const readRefs = artifacts?.filter((a) => a.source === 'read') ?? [];
  const writeRefs = artifacts?.filter((a) => a.source === 'write') ?? [];
  const hasOps = (toolCalls?.length ?? 0) > 0 || readRefs.length > 0;
  const hasAttachments = (attachments?.length ?? 0) > 0;
  const hasReasoning = !!reasoning && reasoning.length > 0;
  const empty = !displayContent && !hasOps && !hasAttachments && writeRefs.length === 0 && !hasReasoning;
  // 流式中（content 还在累加 / inflight tool）不显示反馈条；
  // 等流式完成、有实际文本后再让用户评价。
  const showFeedback = !isUser && !empty && content.length > 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`w-full select-text space-y-2 rounded-xl px-4 py-3 text-[14px] leading-relaxed ${
            isUser ? 'border-2 border-ink bg-yellow text-ink' : 'border-2 border-rule bg-paper text-ink-soft'
          }`}
        >
          {!isUser && hasOps && <OpsGroup toolCalls={toolCalls ?? []} reads={readRefs} />}

          {!isUser && reasoning && reasoning.length > 0 && (
            <ReasoningBlock text={reasoning} streaming={!displayContent} />
          )}

          {displayContent &&
            (isUser ? (
              <div className="whitespace-pre-wrap">{displayContent}</div>
            ) : (
              <MarkdownView source={displayContent} className="text-ink-soft" onPathClick={onPathClick} />
            ))}

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
            />
          </div>
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
