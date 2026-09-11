import { useCallback } from 'react';

import { modelSupportsAudioInput, modelSupportsVision } from '@muicv/shared';

import type { AgentChunk, ArtifactRef, AttachmentRef, ToolCallRecord } from '../../shared/types.ts';
import { classifyError, cryptoRandomId, formatAttachmentsFooter, safeParseJson } from '../components/chat-utils';
import { useAppStore } from './store';

type DispatchCallbacks = {
  onError: (message: string | null) => void;
  onNeedsAiSetup: (needs: boolean) => void;
};

export type AgentDispatchApi = {
  busy: boolean;
  send: (text: string, attachments: AttachmentRef[]) => Promise<void>;
  abort: () => void;
};

/**
 * 把「发消息 → 起 channel → 监听 chunk → 分发给 store / 错误归类 → 清理」整条流水线
 * 抽出来。chat-view 只关心 input 和 attachments，发送细节都进这里。
 *
 * - busy 直接来自 store 的 activeChannel，不再额外维护一份；
 * - chunk handler 在 finish 时自卸，不留 listener 泄漏；
 * - error handler 收口到 onError / onNeedsAiSetup 两个回调，不在 hook 里直接渲染。
 */
export function useAgentDispatch(callbacks: DispatchCallbacks): AgentDispatchApi {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const activeConversation = useAppStore((s) => s.activeConversation);
  const activeChannel = useAppStore((s) => s.activeChannel);
  const defaultModel = useAppStore((s) => s.config.defaultModel);
  const pushMessage = useAppStore((s) => s.pushMessage);
  const appendAssistantText = useAppStore((s) => s.appendAssistantText);
  const appendReasoningText = useAppStore((s) => s.appendReasoningText);
  const attachToolCall = useAppStore((s) => s.attachToolCall);
  const updateToolOutput = useAppStore((s) => s.updateToolOutput);
  const attachArtifact = useAppStore((s) => s.attachArtifact);
  const setActiveChannel = useAppStore((s) => s.setActiveChannel);
  const openRightPanel = useAppStore((s) => s.openRightPanel);

  const { onError, onNeedsAiSetup } = callbacks;

  const handleErrorChunk = useCallback(
    (message: string, assistantId: string) => {
      const kind = classifyError(message);
      if (kind === 'ai-not-configured') {
        onNeedsAiSetup(true);
        appendAssistantText(assistantId, '⚠️ AI 服务还没连上 — 看一下下面的引导');
        onError(null);
      } else if (kind === 'no-profile') {
        onError('当前没有简历资料夹，先去设置新建一份。');
        appendAssistantText(assistantId, '⚠️ 没有简历资料夹');
      } else {
        onError(message);
        appendAssistantText(assistantId, `\n\n⚠️ ${message}`);
      }
    },
    [appendAssistantText, onError, onNeedsAiSetup],
  );

  const send = useCallback(
    async (text: string, attachments: AttachmentRef[]): Promise<void> => {
      // 允许"光发附件不打字"——附件 footer 已经能让 agent 知道做啥
      if (!text && attachments.length === 0) return;
      if (activeChannel !== null) return;
      if (!activeProfile || !activeConversation) return;
      onError(null);
      onNeedsAiSetup(false);

      const footer = formatAttachmentsFooter(attachments, {
        supportsVision: modelSupportsVision(defaultModel),
        supportsAudioInput: modelSupportsAudioInput(defaultModel),
      });
      const userContent = text ? `${text}${footer}` : footer.replace(/^\n\n/, '');
      const userMsg = {
        id: cryptoRandomId(),
        role: 'user' as const,
        content: userContent,
        createdAt: Date.now(),
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      const assistantId = cryptoRandomId();
      const assistantMsg = {
        id: assistantId,
        role: 'assistant' as const,
        content: '',
        toolCalls: [] as ToolCallRecord[],
        artifacts: [] as ArtifactRef[],
        createdAt: Date.now(),
      };
      pushMessage(userMsg);
      pushMessage(assistantMsg);

      try {
        const { channelId } = await window.muicv.agent.chat({
          profileId: activeProfile.id,
          convId: activeConversation.id,
          type: activeConversation.type,
          messages: [...activeConversation.messages, userMsg],
        });
        setActiveChannel(channelId);

        const handler = (e: Event) => {
          const chunk = (e as CustomEvent<AgentChunk>).detail;
          switch (chunk.type) {
            case 'text-delta':
              appendAssistantText(assistantId, chunk.delta);
              break;
            case 'reasoning-delta':
              appendReasoningText(assistantId, chunk.delta);
              break;
            case 'message-completed':
              break;
            case 'tool-called':
              attachToolCall(assistantId, {
                id: chunk.toolCallId,
                name: chunk.toolName,
                input: safeParseJson(chunk.argsJson),
              });
              break;
            case 'tool-output':
              updateToolOutput(assistantId, chunk.toolCallId, chunk.output);
              break;
            case 'artifact': {
              const artifact: ArtifactRef = {
                kind: chunk.kind,
                path: chunk.path,
                title: chunk.title,
                source: chunk.source,
              };
              attachArtifact(assistantId, artifact);
              // 写盘类工件（用户的产物）自动开右栏预览，让用户立即看到结果
              // 读取类（参考资料）只是过程信息，不打扰用户当前视图
              if (chunk.source === 'write') {
                openRightPanel(chunk.path);
              }
              break;
            }
            case 'error':
              handleErrorChunk(chunk.message, assistantId);
              break;
            case 'finish':
              window.removeEventListener(`muicv:agent:chunk:${channelId}`, handler);
              setActiveChannel(null);
              break;
          }
        };
        window.addEventListener(`muicv:agent:chunk:${channelId}`, handler);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        handleErrorChunk(msg, assistantId);
        setActiveChannel(null);
      }
    },
    [
      activeChannel,
      activeProfile,
      activeConversation,
      onError,
      onNeedsAiSetup,
      pushMessage,
      setActiveChannel,
      appendAssistantText,
      attachToolCall,
      updateToolOutput,
      attachArtifact,
      openRightPanel,
      handleErrorChunk,
    ],
  );

  const abort = useCallback(() => {
    if (activeChannel) void window.muicv.agent.abort(activeChannel);
  }, [activeChannel]);

  return { busy: activeChannel !== null, send, abort };
}
