import { useEffect, useRef, useState } from 'react';

import type { AttachmentRef } from '../../shared/types.ts';
import { CONVERSATION_TYPE_META } from '../../shared/types.ts';
import { CONVERSATION_TYPE_ICON } from '../lib/conversation-type-icon';
import { useAppStore } from '../lib/store';
import { useAgentDispatch } from '../lib/use-agent-dispatch';
import { useChatAttachments } from '../lib/use-chat-attachments';
import { AttachmentPreviewDialog } from './attachment-preview-dialog';
import { AiSetupCard, CenteredCard, EmptyConversation, NoConversationCard } from './chat-empty-states';
import { ChatInputBar } from './chat-input-bar';
import { MessageBubble } from './chat-message-bubble';
import { resolveWorkspacePath, stripLeadingEmoji } from './chat-utils';

/**
 * 中栏：当前 activeConversation 的对话流 + 输入框。
 *
 * 流程：
 *   1. 发送 → push user msg + 一条空 assistant msg 到 activeConversation.messages
 *   2. invoke('agent:chat', { profileId, convId, type, messages }) 拿 channelId
 *   3. addEventListener `muicv:agent:chunk:<channelId>` 累加增量；artifact chunk
 *      attach 到当前 assistant msg
 *   4. 'finish' / 'error' 解绑 + 解锁输入；main 已经把整份 conv flush 到磁盘
 *
 * 三个核心拆分点：
 *   - useChatAttachments：附件托盘状态 + drag-drop + 上传
 *   - useAgentDispatch：发消息 / 流监听 / 错误归类（含 ai-not-configured 分流）
 *   - ChatInputBar：底部输入面板（input 草稿 / mic / 附件按钮 / 发送 / slash 菜单）
 */
export function ChatView() {
  const session = useAppStore((s) => s.session);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const activeConversation = useAppStore((s) => s.activeConversation);
  const onboardingDraft = useAppStore((s) => s.onboardingDraft);
  const clearOnboardingDraft = useAppStore((s) => s.clearOnboardingDraft);
  const forkConversation = useAppStore((s) => s.forkConversation);
  const rollbackConversation = useAppStore((s) => s.rollbackConversation);
  const setView = useAppStore((s) => s.setView);
  const openRightPanel = useAppStore((s) => s.openRightPanel);

  const [draft, setDraft] = useState<string | null>(onboardingDraft);
  const [error, setError] = useState<string | null>(null);
  const [needsAiSetup, setNeedsAiSetup] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<AttachmentRef | null>(null);

  useEffect(() => {
    if (onboardingDraft != null) {
      setDraft(onboardingDraft);
    }
  }, [onboardingDraft]);

  // 图片永远接收：vision 模型走 input_image 直接看图；非 vision 模型走 upload_photo
  // tool 链路（用户拖证件照 → AI 上传到 R2 → 写回 .resume.json）。不再在入口拦图。
  const attachments = useChatAttachments(activeProfile, activeConversation?.id ?? null, true);
  const dispatch = useAgentDispatch({ onError: setError, onNeedsAiSetup: setNeedsAiSetup });

  // 黏底滚动：切会话强制滚到最底；消息更新（含流式 chunk）若用户当前贴底则跟随，
  // 用户向上滚阅读历史则中断跟随，避免被强制拉回。
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const conversationId = activeConversation?.id ?? null;
  const messagesRef = activeConversation?.messages;

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conversationId, messagesRef]);

  function handleScroll(): void {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  if (!session || !activeProfile) {
    return (
      <CenteredCard
        title="先建一份职业档案"
        body="在左栏点 + 新建职业档案 就能开始啦。"
        ctaLabel="去设置 →"
        onCta={() => setView('settings')}
      />
    );
  }

  if (!activeConversation) {
    return <NoConversationCard />;
  }

  const meta = CONVERSATION_TYPE_META[activeConversation.type];
  const messages = activeConversation.messages;
  const TypeIcon = CONVERSATION_TYPE_ICON[activeConversation.type];

  async function handleSend(text: string): Promise<void> {
    clearOnboardingDraft();
    setDraft(null);
    await dispatch.send(text, attachments.pendingAttachments);
    attachments.clearAfterSend();
  }

  async function handleFork(messageId: string, title?: string): Promise<void> {
    try {
      await forkConversation(messageId, title);
    } catch (err) {
      setError(`分叉对话失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleRollback(messageId: string): Promise<void> {
    try {
      const result = await rollbackConversation(messageId);
      setDraft(result.rolledBackContent);
      if (result.attachments && result.attachments.length > 0) {
        for (const a of result.attachments) {
          attachments.addAttachment(a);
        }
      }
    } catch (err) {
      setError(`回滚失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col"
      onDragEnter={attachments.onDragEnter}
      onDragOver={attachments.onDragOver}
      onDragLeave={attachments.onDragLeave}
      onDrop={attachments.onDrop}
    >
      <ConversationHeader
        title={stripLeadingEmoji(activeConversation.title)}
        TypeIcon={TypeIcon}
        typeLabel={meta.label}
      />

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6"
        onContextMenu={(e) => {
          // 拦下 Chromium 默认菜单，弹 native 只读菜单（复制 / 全选），方便从历史消息复制
          e.preventDefault();
          window.muicv.chatInput.showContextMenu({ editable: false });
        }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.length === 0 ? (
            <EmptyConversation type={activeConversation.type} />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                messageId={m.id}
                conversationId={activeConversation.id}
                conversationTitle={activeConversation.title}
                role={m.role}
                content={m.content}
                reasoning={m.reasoning}
                attachments={m.attachments}
                toolCalls={m.toolCalls}
                artifacts={m.artifacts}
                feedback={m.feedback}
                onOpenArtifact={(a) =>
                  a.kind === 'resume-preview' ? window.muicv.shell.openExternal(a.path) : openRightPanel(a.path)
                }
                onPreviewAttachment={setHistoryPreview}
                onPathClick={(p) => openRightPanel(resolveWorkspacePath(activeProfile?.dir ?? null, p))}
                onFork={handleFork}
                onRollback={handleRollback}
              />
            ))
          )}
          {needsAiSetup && (
            <AiSetupCard onGoSettings={() => setView('settings')} onDismiss={() => setNeedsAiSetup(false)} />
          )}
        </div>
      </div>

      <ChatInputBar
        contextKey={`${activeProfile.id}:${activeConversation.id}`}
        placeholder={meta.placeholder}
        initialDraft={draft}
        busy={dispatch.busy}
        errorMessage={error}
        attachments={attachments}
        onMicError={setError}
        onSend={(text) => void handleSend(text)}
        onAbort={dispatch.abort}
        onOpenSettings={() => setView('settings')}
      />

      {attachments.isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-cream/85 backdrop-blur-sm">
          <div className="rounded-xl border-4 border-dashed border-yellow-deep bg-cream/90 px-8 py-6 text-center">
            <p className="text-[16px] font-bold text-ink">把文件松开就行 📎</p>
            <p className="mt-1 text-[12px] text-ink-soft">支持 PDF / DOCX / Markdown / 文本，单次最多 5 个</p>
          </div>
        </div>
      )}

      {historyPreview && (
        <AttachmentPreviewDialog attachment={historyPreview} onClose={() => setHistoryPreview(null)} />
      )}
    </div>
  );
}

function ConversationHeader({
  title,
  TypeIcon,
  typeLabel,
}: {
  title: string;
  TypeIcon: import('@phosphor-icons/react').Icon;
  typeLabel: string;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-cream/70 px-6 py-3 backdrop-blur-sm">
      <h1 className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-ink">{title}</h1>
      <span className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-2 py-0.5 font-mono text-[12px] font-semibold text-ink-soft">
        <TypeIcon size={11} className="shrink-0 text-yellow-deep" />
        <span>{typeLabel}</span>
      </span>
    </header>
  );
}
