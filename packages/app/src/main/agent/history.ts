/**
 * 把持久化的 ChatMessage[] 转成 OpenAI Agents SDK 的 AgentInputItem[]，
 * 同时实现一个简单的滑动窗口：超过 token budget 时丢弃最早的非必要消息。
 *
 * 设计取舍：
 *   - 不引入 tiktoken：用 char/2.5 估算文本，每张图按 IMAGE_TOKEN_BUDGET 计入预算。
 *     偏保守反而能多留 headroom 给 system prompt + 输出。
 *   - **历史里所有 user message 的图像附件都重新内联进 input**（Claude Code 模式）。
 *     每轮带全部历史图，靠底层 LLM 的 prompt cache（OpenAI automatic / Anthropic
 *     cache_control）抵成本。模型本轮真能看见所有图，不再发生"历史图丢了，模型凭文字
 *     描述瞎猜"——见 issue meathill/muicv#7 之外的 multimodal 回归。
 */

import type { AgentInputItem } from '@openai/agents';

import type { AttachmentRef, ChatMessage } from '../../shared/types.ts';

/**
 * 模型 context window 上限（显示 token）。当前给所有模型走同一个保守值
 * 256k——主流模型都 >= 200k（gpt-5.x、mimo-v2.5-pro 等）。
 *
 * 不做 per-model 表，因为：
 *   - muicv 后端可能随时加新模型，硬编码表会过期；
 *   - 保守值在所有情况下都安全，代价是大 context 模型不能完全榨干。
 */
const MODEL_CONTEXT_LIMIT = 256_000;

/**
 * 触发自动压缩（裁剪）的阈值，占 MODEL_CONTEXT_LIMIT 的比例。
 * 留 20% 给 system prompt + tool schema + 模型本轮输出。
 * 历史 token 一旦超过 limit * threshold，就开始丢最早的非必要消息。
 */
const COMPACT_THRESHOLD = 0.8;

/**
 * 单张 input_image 在预算里按多少 token 计入。OpenAI 标准 detail=high 一张
 * 约 765-1500 tokens，取 1200 偏保守，宁可少装一条历史也不要爆 context。
 */
export const IMAGE_TOKEN_BUDGET = 1200;

/**
 * 每条音频附件在预算里按多少 token 计入。
 * Xiaomi 文档：Total tokens ≈ duration_sec × 6.25。
 * 我们没有 duration 字段，按"普通一段 30s 自我介绍 ~190 tokens"打底，给个 200 token 的常量估计。
 * 偏低估，让滑动窗口少 evict 一条历史；真实账单以 API 响应为准。
 */
export const AUDIO_TOKEN_BUDGET = 200;

/** 估算 token 数：char/2.5。中文密集场景偏保守（实际 ~1 token/汉字），英文略低估。 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

/** 给定模型 id 的 token 预算 = context 上限 × 触发阈值。所有模型走同一保守值。 */
export function getModelBudget(_modelId: string): number {
  return Math.floor(MODEL_CONTEXT_LIMIT * COMPACT_THRESHOLD);
}

export type ImageReader = (ref: AttachmentRef) => Promise<string | null>;
export type AudioReader = (ref: AttachmentRef) => Promise<string | null>;

/** mimo-v2.5 / mimo-v2-omni 原生听音支持的容器格式，对应上游 input_audio.format。 */
type AudioFormat = 'wav' | 'mp3' | 'flac' | 'm4a' | 'ogg';

const AUDIO_FORMAT_BY_MIME: Record<string, AudioFormat> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
};

const AUDIO_FORMAT_BY_EXT: Record<string, AudioFormat> = {
  wav: 'wav',
  mp3: 'mp3',
  flac: 'flac',
  m4a: 'm4a',
  ogg: 'ogg',
};

/**
 * 从附件元数据推导上游需要的 audio format：优先 mimeType，回退文件扩展名，
 * 都认不出来时兜底 'wav'（录音附件恒为 wav，是最安全的默认值）。
 * 不能硬编码 'wav'——用户可直接上传 mp3/flac/m4a/ogg，错标格式会让模型解码失败。
 */
function resolveAudioFormat(ref: AttachmentRef): AudioFormat {
  const byMime = AUDIO_FORMAT_BY_MIME[ref.mimeType?.toLowerCase() ?? ''];
  if (byMime) return byMime;
  const ext = (ref.name || ref.path).split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_FORMAT_BY_EXT[ext] ?? 'wav';
}

export type BuildAgentInputResult = {
  items: AgentInputItem[];
  /** 被丢弃的历史 ChatMessage 条数（不含插入的 ellipsis 提示）。 */
  droppedCount: number;
  /** items 整体的预估 token 数（含 ellipsis 提示 + 图像 budget）。 */
  estimatedTokens: number;
};

/**
 * 把 ChatMessage[] 转成 AgentInputItem[]。
 *
 * 滑动窗口策略：
 *   - 最后一条 user message 永远保留（即使本身超 budget）——丢用户最新输入更糟；
 *   - 其余从最新往最早贪心累加（含图像 budget），超 budget 即停；
 *   - 中间被切断时在保留段最前面插一条 user 提示「（已省略 N 条更早的对话）」，
 *     让模型知道历史不完整。
 *
 * 当 `imageReader` 注入时，**所有保留的 user message 上的 image 附件**会被
 * 读成 data URL 拼进 content（input_text + input_image array）。不传 reader
 * 时退化为纯文本——给老的纯文本测试 / 不需要 vision 的场景用。
 *
 * 不还原 tool_call / tool_result 链：assistant.toolCalls 字段在送 LLM 时
 * 被忽略，跟 MVP 字符串拼接版本行为一致。
 */
export async function buildAgentInput(
  messages: ChatMessage[],
  opts?: { budgetTokens?: number; imageReader?: ImageReader; audioReader?: AudioReader },
): Promise<BuildAgentInputResult> {
  const budget = opts?.budgetTokens ?? Math.floor(MODEL_CONTEXT_LIMIT * COMPACT_THRESHOLD);
  if (messages.length === 0) {
    return { items: [], droppedCount: 0, estimatedTokens: 0 };
  }

  const reversed = [...messages].reverse();
  const kept: ChatMessage[] = [];
  let tokenAcc = 0;
  let isFirst = true;

  for (const m of reversed) {
    const cost =
      estimateTokens(m.content ?? '') + countImages(m) * IMAGE_TOKEN_BUDGET + countAudios(m) * AUDIO_TOKEN_BUDGET;
    if (isFirst) {
      // 最后一条（reverse 后的第一条）不论多大都保留
      kept.push(m);
      tokenAcc += cost;
      isFirst = false;
      continue;
    }
    if (tokenAcc + cost > budget) break;
    kept.push(m);
    tokenAcc += cost;
  }

  kept.reverse();
  const droppedCount = messages.length - kept.length;
  const items: AgentInputItem[] = await Promise.all(kept.map((m) => toItem(m, opts?.imageReader, opts?.audioReader)));

  if (droppedCount > 0) {
    const ellipsisText = `（已省略 ${droppedCount} 条更早的对话）`;
    items.unshift({ role: 'user', content: ellipsisText });
    tokenAcc += estimateTokens(ellipsisText);
  }

  return { items, droppedCount, estimatedTokens: tokenAcc };
}

function countImages(msg: ChatMessage): number {
  if (msg.role !== 'user') return 0;
  return (msg.attachments ?? []).filter((a) => a.kind === 'image').length;
}

function countAudios(msg: ChatMessage): number {
  if (msg.role !== 'user') return 0;
  return (msg.attachments ?? []).filter((a) => a.kind === 'audio').length;
}

async function toItem(msg: ChatMessage, imageReader?: ImageReader, audioReader?: AudioReader): Promise<AgentInputItem> {
  const text = msg.content ?? '';
  if (msg.role === 'assistant') {
    return {
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text }],
    };
  }
  if (msg.role === 'system') {
    return { role: 'system', content: text };
  }
  // user / tool（持久化里不该出现 tool，兜底当 user 处理避免崩）
  const attachments = msg.attachments ?? [];
  const images = imageReader ? attachments.filter((a) => a.kind === 'image') : [];
  const audios = audioReader ? attachments.filter((a) => a.kind === 'audio') : [];
  if (images.length === 0 && audios.length === 0) {
    return { role: 'user', content: text };
  }

  const imageUrls: string[] = [];
  if (imageReader) {
    for (const img of images) {
      const url = await imageReader(img);
      if (url) imageUrls.push(url);
    }
  }
  const audioBlocks: { data: string; format: AudioFormat }[] = [];
  if (audioReader) {
    for (const audio of audios) {
      const data = await audioReader(audio);
      if (data) audioBlocks.push({ data, format: resolveAudioFormat(audio) });
    }
  }
  if (imageUrls.length === 0 && audioBlocks.length === 0) {
    // 全部读失败：留下文本（footer 里仍说"已附图/音频"，至少模型知道用户上传过——
    // 比偷换成空 array 更诚实，且老对话被搬迁过工作目录时不至于完全断流）
    return { role: 'user', content: text };
  }

  // 注：这里用 Agents SDK 的内部 audio content block。chat_completions converter
  // 会把它转换成上游 API 的 `{ type: 'input_audio', input_audio: { data, format } }`。
  // 直接塞 `type: 'input_audio'` 会在 SDK 层报 Unknown content。
  type UserContentBlock =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image: string }
    | { type: 'audio'; audio: string; format: AudioFormat };
  const content: UserContentBlock[] = [];
  if (text) content.push({ type: 'input_text', text });
  for (const url of imageUrls) {
    content.push({ type: 'input_image', image: url });
  }
  for (const block of audioBlocks) {
    content.push({ type: 'audio', audio: block.data, format: block.format });
  }
  return { role: 'user', content } as AgentInputItem;
}
