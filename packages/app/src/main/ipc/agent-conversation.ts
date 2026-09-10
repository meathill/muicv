import { ipcMain } from 'electron';

import type { ChatMessage, ChatMessageFeedback, ConversationType, QuestionAnswerPayload } from '../../shared/types.ts';
import { answerQuestion } from '../agent/question-tools.ts';
import { abortRun, runAgent } from '../agent/runtime.ts';
import {
  createConversation,
  deleteConversation,
  forkConversation,
  getConversation,
  listConversations,
  renameConversation,
  rollbackConversation,
  setMessageFeedback,
} from '../conversations.ts';
import { type CommentArgs, commentFeedback, type RateArgs, rateFeedback } from '../feedback.ts';
import { getConfig } from '../store.ts';

/** agent / conversation / feedback IPC：跑 agent / 管会话 / 上报赞踩。 */
export function registerAgentConversationIpc(): void {
  // -------- agent --------
  ipcMain.handle(
    'agent:chat',
    async (
      event,
      opts: {
        profileId: string;
        convId: string;
        type: ConversationType;
        messages: ChatMessage[];
      },
    ): Promise<{ channelId: string }> => {
      const channelId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cfg = getConfig();
      runAgent({
        channelId,
        profileId: opts.profileId,
        convId: opts.convId,
        type: opts.type,
        messages: opts.messages,
        config: cfg,
        sender: event.sender,
      }).catch((err) => {
        console.error('[agent:chat] runtime crashed', err);
      });
      return { channelId };
    },
  );

  ipcMain.handle('agent:abort', async (_event, channelId: string) => {
    abortRun(channelId);
  });
  ipcMain.handle('agent:answerQuestion', async (_event, toolCallId: string, payload: QuestionAnswerPayload) => {
    return answerQuestion(toolCallId, payload);
  });

  // -------- conversation --------
  ipcMain.handle('conversation:list', (_e, profileId: string) => listConversations(profileId));
  ipcMain.handle('conversation:get', (_e, profileId: string, convId: string) => getConversation(profileId, convId));
  ipcMain.handle('conversation:create', (_e, opts: { profileId: string; type: ConversationType; title?: string }) =>
    createConversation(opts),
  );
  ipcMain.handle('conversation:fork', (_e, profileId: string, convId: string, messageId: string, title?: string) =>
    forkConversation(profileId, convId, messageId, title),
  );
  ipcMain.handle('conversation:rollback', (_e, profileId: string, convId: string, messageId: string) =>
    rollbackConversation(profileId, convId, messageId),
  );
  ipcMain.handle('conversation:rename', (_e, profileId: string, convId: string, title: string) =>
    renameConversation(profileId, convId, title),
  );
  ipcMain.handle('conversation:remove', (_e, profileId: string, convId: string) =>
    deleteConversation(profileId, convId),
  );
  ipcMain.handle(
    'conversation:setMessageFeedback',
    (_e, profileId: string, convId: string, messageId: string, patch: Partial<ChatMessageFeedback>) =>
      setMessageFeedback(profileId, convId, messageId, patch),
  );

  // -------- feedback (赞 / 踩 / 意见建议 → packages/api) --------
  ipcMain.handle('feedback:rate', (_e, args: RateArgs) => rateFeedback(args));
  ipcMain.handle('feedback:comment', (_e, args: CommentArgs) => commentFeedback(args));
}
