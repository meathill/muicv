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
 * 默认模型 context window 上限（显示 token）。GPT 及未知模型走这个保守值
 * 256k——主流模型都 >= 200k。
 *
 * 不做完整 per-model 表，因为 muicv 后端可能随时加新模型，硬编码表会过期；
 * 只对确有大 context 的系列（mimo）按前缀单独放开，见 getModelBudget。
 */
const DEFAULT_CONTEXT_LIMIT = 256_000;

/**
 * mimo 系列 context window 上限。Xiaomi v2.5 降价后取消了 256K 阶梯计价，
 * 全 context（最高 1M）统一价，所以让 mimo 吃满 1M。
 * 见 https://platform.xiaomimimo.com/docs/zh-CN/news/v2.5-price-update
 */
const MIMO_CONTEXT_LIMIT = 1_000_000;

/**
 * 触发自动压缩（裁剪）的阈值，占 context 上限的比例。
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

/** 给定模型 id 的 token 预算 = context 上限 × 触发阈值。mimo 系列走 1M，其余走 256K。 */
export function getModelBudget(modelId: string): number {
  const limit = modelId.startsWith('mimo-') ? MIMO_CONTEXT_LIMIT : DEFAULT_CONTEXT_LIMIT;
  return Math.floor(limit * COMPACT_THRESHOLD);
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
 * 图像多模态策略：
 *   - 仅对【最新一条 user message】（当前窗口）内联图片 data URL（最多 MAX_PROMPT_IMAGES = 4 张）；
 *   - 历史 user message 中的图片略过（不传 base64 数据），保留纯文本占位（footer 里的文件名）；
 *   - 这样既严格满足 DeepSeek 等上游模型「单次 prompt 最多 4 张图」的硬限制，
 *     又避免了多轮对话中重复传输巨量 base64 造成的延迟和 token 爆炸。
 *
 * 不还原 tool_call / tool_result 链：assistant.toolCalls 字段在送 LLM 时
 * 被忽略，跟 MVP 字符串拼接版本行为一致。
 */
export const MAX_PROMPT_IMAGES = 4;

export async function buildAgentInput(
  messages: ChatMessage[],
  opts?: { budgetTokens?: number; imageReader?: ImageReader; audioReader?: AudioReader },
): Promise<BuildAgentInputResult> {
  const budget = opts?.budgetTokens ?? Math.floor(DEFAULT_CONTEXT_LIMIT * COMPACT_THRESHOLD);
  if (messages.length === 0) {
    return { items: [], droppedCount: 0, estimatedTokens: 0 };
  }

  const reversed = [...messages].reverse();
  const kept: ChatMessage[] = [];
  let tokenAcc = 0;
  let isFirst = true;

  for (const m of reversed) {
    // 仅最后一条 user message（当前窗口）计算图片 token；历史 user 消息不传图片 base64
    const imgCount = isFirst ? Math.min(MAX_PROMPT_IMAGES, countImages(m)) : 0;
    const cost = estimateTokens(m.content ?? '') + imgCount * IMAGE_TOKEN_BUDGET + countAudios(m) * AUDIO_TOKEN_BUDGET;
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
  // 仅最后一条 user 消息内联图片，历史消息图片略过
  const items: AgentInputItem[] = await Promise.all(
    kept.map((m, idx) => {
      const isLatestUser = idx === kept.length - 1 && m.role === 'user';
      return toItem(m, isLatestUser ? opts?.imageReader : undefined, opts?.audioReader);
    }),
  );

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
  const images = imageReader ? attachments.filter((a) => a.kind === 'image').slice(0, MAX_PROMPT_IMAGES) : [];
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
