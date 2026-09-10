import { tool } from '@openai/agents';
import { z } from 'zod';

import type { QuestionAnswerPayload } from '../../shared/types.ts';

type QuestionPending = {
  callId: string;
  resolve: (output: string) => void;
  reject: (err: Error) => void;
};

// 全局 pending 队列，供 IPC answerQuestion 查找并唤醒
const pendingQuestions = new Map<string, QuestionPending>();
const pendingOrder: string[] = [];

/**
 * 由 IPC 调用：用户在前端提交提问回答时唤醒对应的 ask_question 执行器
 */
export function answerQuestion(toolCallId: string, payload: QuestionAnswerPayload): boolean {
  let pending = pendingQuestions.get(toolCallId);
  if (!pending && pendingOrder.length > 0) {
    // 兜底：toolCallId 匹配不上时（SDK 内部 callId 格式差异），取最早入队的那个 pending。
    // 当前架构单 run 串行，不会同时存在多个提问；并发场景需要按 channel 隔离队列。
    const fallbackId = pendingOrder[0];
    if (fallbackId) {
      pending = pendingQuestions.get(fallbackId);
    }
  }

  if (!pending) return false;

  pendingQuestions.delete(pending.callId);
  const idx = pendingOrder.indexOf(pending.callId);
  if (idx !== -1) pendingOrder.splice(idx, 1);

  let formatted = '';
  if (Array.isArray(payload.answer) && payload.answer.length > 0) {
    formatted = `用户选择了：${payload.answer.join('、')}`;
  } else if (typeof payload.answer === 'string' && payload.answer.trim()) {
    formatted = `用户选择了：${payload.answer.trim()}`;
  }

  if (payload.customText?.trim()) {
    formatted = formatted
      ? `${formatted}。用户补充说明：${payload.customText.trim()}`
      : `用户回答：${payload.customText.trim()}`;
  }

  if (!formatted) {
    formatted = '用户确认了该步骤（未填写具体内容）';
  }

  pending.resolve(formatted);
  return true;
}

/**
 * 取消 / 中止当前 run 时清理所有等待中的提问
 */
export function cancelPendingQuestions(reason = 'aborted'): void {
  for (const [, p] of pendingQuestions) {
    p.reject(new Error(`提问已取消（${reason}）`));
  }
  pendingQuestions.clear();
  pendingOrder.length = 0;
}

export function buildQuestionTools(onWaitChange?: (waiting: boolean) => void) {
  const askQuestionTool = tool({
    name: 'ask_question',
    description:
      '向用户提问以获取偏好选择、关键信息确认或方案决策。当需要用户明确意图、在多个方向中做抉择、或缺少关键素材需要用户补充时优先调用本工具。用户提交回答后将返回结构化结果供你继续执行。',
    parameters: z.object({
      question: z.string().describe('向用户提出的具体问题内容'),
      options: z.array(z.string()).optional().describe('供用户选择的选项列表（如有多项选择）'),
      multiSelect: z.boolean().optional().describe('是否允许多选，默认为 false（单选）'),
    }),
    execute: async (_args, _runContext, details) => {
      // 从 SDK details 提取当前工具调用的 callId
      const rawCallId =
        (details as { toolCall?: { callId?: string; id?: string } })?.toolCall?.callId ??
        (details as { toolCall?: { callId?: string; id?: string } })?.toolCall?.id ??
        `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      onWaitChange?.(true);

      return new Promise<string>((resolve, reject) => {
        const entry: QuestionPending = {
          callId: rawCallId,
          resolve: (result) => {
            onWaitChange?.(false);
            resolve(result);
          },
          reject: (err) => {
            onWaitChange?.(false);
            reject(err);
          },
        };

        pendingQuestions.set(rawCallId, entry);
        pendingOrder.push(rawCallId);
      });
    },
  });

  return [askQuestionTool];
}
