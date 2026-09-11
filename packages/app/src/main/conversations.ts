import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { stripAttachmentFooter } from '@muicv/shared';

import {
  type ChatMessageFeedback,
  CONVERSATION_TYPE_META,
  type Conversation,
  type ConversationSummary,
  type ConversationType,
} from '../shared/types.ts';
import { listProfiles } from './store.ts';

/**
 * 对话持久化：每份对话一个 JSON 文件，存在 <profile.dir>/.claude/muicv/conversations/<id>.json
 *
 * 设计意图：
 * - 跟 profile 的资料夹一起 git，多设备同步天然
 * - 删 profile 时连带丢（符合直觉）
 * - 人类可读，调试方便
 *
 * 写盘策略：上层（runtime）在 finish chunk 后调 saveConversation 整份 flush；
 * 流式 text-delta 期间不写盘。
 */

function conversationsDir(profileDir: string): string {
  return join(profileDir, '.claude', 'muicv', 'conversations');
}

function conversationFile(profileDir: string, convId: string): string {
  return join(conversationsDir(profileDir), `${convId}.json`);
}

function profileDirById(profileId: string): string | null {
  return listProfiles().find((p) => p.id === profileId)?.dir ?? null;
}

/** 默认标题：「[类型 label] · MM-DD」。类型图标在 UI 层独立渲染。 */
function defaultTitle(type: ConversationType): string {
  const meta = CONVERSATION_TYPE_META[type];
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${meta.label} · ${mm}-${dd}`;
}

export async function listConversations(profileId: string): Promise<ConversationSummary[]> {
  const dir = profileDirById(profileId);
  if (!dir) return [];
  const root = conversationsDir(dir);
  let files: string[];
  try {
    files = await readdir(root);
  } catch {
    return [];
  }
  const summaries: ConversationSummary[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const text = await readFile(join(root, f), 'utf8');
      const conv = JSON.parse(text) as Conversation;
      summaries.push({
        id: conv.id,
        profileId: conv.profileId,
        type: conv.type,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages?.length ?? 0,
      });
    } catch {
      // 跳过损坏的文件
    }
  }
  summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  return summaries;
}

export async function getConversation(profileId: string, convId: string): Promise<Conversation | null> {
  const dir = profileDirById(profileId);
  if (!dir) return null;
  try {
    const text = await readFile(conversationFile(dir, convId), 'utf8');
    return JSON.parse(text) as Conversation;
  } catch {
    return null;
  }
}

export async function createConversation(opts: {
  profileId: string;
  type: ConversationType;
  title?: string;
}): Promise<Conversation> {
  const dir = profileDirById(opts.profileId);
  if (!dir) throw new Error('profile-not-found');

  const now = Date.now();
  const conv: Conversation = {
    id: randomUUID(),
    profileId: opts.profileId,
    type: opts.type,
    title: opts.title?.trim() || defaultTitle(opts.type),
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  await mkdir(conversationsDir(dir), { recursive: true });
  await writeFile(conversationFile(dir, conv.id), JSON.stringify(conv, null, 2), 'utf8');
  return conv;
}

/** 整份 flush。runtime finish 后调一次。 */
export async function saveConversation(conv: Conversation): Promise<void> {
  const dir = profileDirById(conv.profileId);
  if (!dir) return;
  await mkdir(conversationsDir(dir), { recursive: true });
  const next = { ...conv, updatedAt: Date.now() };
  await writeFile(conversationFile(dir, conv.id), JSON.stringify(next, null, 2), 'utf8');
}

export async function renameConversation(profileId: string, convId: string, title: string): Promise<void> {
  const conv = await getConversation(profileId, convId);
  if (!conv) return;
  conv.title = title.trim() || conv.title;
  await saveConversation(conv);
}

/**
 * 给一条消息 patch feedback 缓存（赞 / 踩状态、是否拿过评论奖励）。
 * 找不到 profile / conv / message 时静默返回 false——这是缓存数据，云端是 source of truth。
 *
 * 浅合并：传入的字段覆盖原有；undefined 字段保留。
 */
export async function setMessageFeedback(
  profileId: string,
  convId: string,
  messageId: string,
  patch: Partial<ChatMessageFeedback>,
): Promise<boolean> {
  const conv = await getConversation(profileId, convId);
  if (!conv) return false;
  const msg = conv.messages.find((m) => m.id === messageId);
  if (!msg) return false;
  msg.feedback = { ...(msg.feedback ?? {}), ...patch };
  await saveConversation(conv);
  return true;
}

export async function deleteConversation(profileId: string, convId: string): Promise<void> {
  const dir = profileDirById(profileId);
  if (!dir) return;
  try {
    await unlink(conversationFile(dir, convId));
  } catch {
    // 文件不存在也无所谓
  }
}

/**
 * 从某条 AI 发言（或指定 messageId）处分叉生成一个新对话。
 * 复制截至该消息的所有历史，保留上下文，开启新的分支探索。
 */
export async function forkConversation(
  profileId: string,
  convId: string,
  messageId: string,
  newTitle?: string,
): Promise<Conversation> {
  const conv = await getConversation(profileId, convId);
  if (!conv) throw new Error('conversation-not-found');

  const idx = conv.messages.findIndex((m) => m.id === messageId);
  if (idx === -1) throw new Error('message-not-found');

  const slicedMessages = conv.messages.slice(0, idx + 1);
  const now = Date.now();
  const forkedConv: Conversation = {
    id: randomUUID(),
    profileId,
    type: conv.type,
    title: newTitle?.trim() || `${conv.title} (分支)`,
    createdAt: now,
    updatedAt: now,
    messages: JSON.parse(JSON.stringify(slicedMessages)),
  };

  await saveConversation(forkedConv);
  return forkedConv;
}

/**
 * 回滚到某条用户发言：截断该消息及其之后的所有对话，
 * 返回该消息原文本（剥离附件 footer）与附件列表供重新填入输入框编辑。
 */
export async function rollbackConversation(
  profileId: string,
  convId: string,
  messageId: string,
): Promise<{
  conversation: Conversation;
  rolledBackContent: string;
  attachments?: import('../shared/types.ts').AttachmentRef[];
}> {
  const conv = await getConversation(profileId, convId);
  if (!conv) throw new Error('conversation-not-found');

  const idx = conv.messages.findIndex((m) => m.id === messageId);
  if (idx === -1) throw new Error('message-not-found');

  const targetMsg = conv.messages[idx];
  if (!targetMsg) throw new Error('message-not-found');

  conv.messages = conv.messages.slice(0, idx);
  await saveConversation(conv);

  const rolledBackContent = stripAttachmentFooter(targetMsg.content);

  return {
    conversation: conv,
    rolledBackContent,
    attachments: targetMsg.attachments ?? [],
  };
}
