import { FEEDBACK_COMMENT_MAX_CHARS } from '@muicv/shared';
import type { Context } from 'hono';

import {
  commentMessage,
  commentResultToWire,
  countCodePoints,
  type RatingKind,
  rateMessage,
  rateResultToWire,
} from '../lib/feedback.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * POST /feedback/rate —— 给一条 AI 消息打分（赞 / 踩）。
 *
 * Body: { messageId: string, conversationId: string, rating: 'praise' | 'dislike' }
 * Resp: { ok: true, feedbackId, rating, awarded, alreadyRewarded, balance }（显示 token）
 *
 * 同一条消息：
 *   - 首次评分（不论 praise/dislike）发 1000 显示 token 奖励
 *   - 切换 praise ↔ dislike 仅更新状态，不再发奖（awarded=0, alreadyRewarded=true）
 */
export async function handleRate(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  let payload: { messageId?: unknown; conversationId?: unknown; rating?: unknown };
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是合法 JSON' }, 400);
  }

  if (typeof payload.messageId !== 'string' || payload.messageId.length === 0 || payload.messageId.length > 128) {
    return c.json({ error: '字段 `messageId` 必须是 1~128 字符的字符串' }, 400);
  }
  if (
    typeof payload.conversationId !== 'string' ||
    payload.conversationId.length === 0 ||
    payload.conversationId.length > 128
  ) {
    return c.json({ error: '字段 `conversationId` 必须是 1~128 字符的字符串' }, 400);
  }
  if (payload.rating !== 'praise' && payload.rating !== 'dislike') {
    return c.json({ error: "字段 `rating` 必须是 'praise' 或 'dislike'" }, 400);
  }

  const result = await rateMessage(c.env, userId, {
    messageId: payload.messageId,
    conversationId: payload.conversationId,
    rating: payload.rating as RatingKind,
  });

  return c.json({ ok: true, ...rateResultToWire(result) });
}

/**
 * POST /feedback/comment —— 给一条 AI 消息留文字反馈（"意见建议"）。
 *
 * Body: { messageId, conversationId, text }
 * Resp: { ok: true, feedbackId, charCount, awarded, balance, minChars, maxChars }
 *
 * 不限次数。text 长度（unicode code point）≥ minChars 才发奖（50,000 显示 token）。
 */
export async function handleComment(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  let payload: { messageId?: unknown; conversationId?: unknown; text?: unknown };
  try {
    payload = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是合法 JSON' }, 400);
  }

  if (typeof payload.messageId !== 'string' || payload.messageId.length === 0 || payload.messageId.length > 128) {
    return c.json({ error: '字段 `messageId` 必须是 1~128 字符的字符串' }, 400);
  }
  if (
    typeof payload.conversationId !== 'string' ||
    payload.conversationId.length === 0 ||
    payload.conversationId.length > 128
  ) {
    return c.json({ error: '字段 `conversationId` 必须是 1~128 字符的字符串' }, 400);
  }
  if (typeof payload.text !== 'string') {
    return c.json({ error: '字段 `text` 必须是字符串' }, 400);
  }
  const trimmed = payload.text.trim();
  if (trimmed.length === 0) {
    return c.json({ error: '`text` 不能为空' }, 400);
  }
  if (countCodePoints(trimmed) > FEEDBACK_COMMENT_MAX_CHARS) {
    return c.json({ error: `\`text\` 不能超过 ${FEEDBACK_COMMENT_MAX_CHARS} 字` }, 400);
  }

  const result = await commentMessage(c.env, userId, {
    messageId: payload.messageId,
    conversationId: payload.conversationId,
    text: trimmed,
  });

  return c.json({ ok: true, ...commentResultToWire(result) });
}
