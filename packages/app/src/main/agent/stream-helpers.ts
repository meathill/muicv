/**
 * Stream / error 工具：watchdog 时长决定、错误消息识别等。runtime.ts 主循环用。
 */
import { isThinkingModeModel } from './reasoning-capture.ts';

/**
 * OpenAI Agents SDK 的 turn 指一次模型响应或工具往返。简历工作流经常会连续读写
 * 多个素材文件、预览、渲染，30 轮偏紧；仍保留上限，防止工具循环失控。
 */
export const AGENT_MAX_TURNS = 80;

/**
 * 普通模型 30s（GPT 经 muirouter 冷启动通常 8-15s，留 2 倍 headroom）；
 * thinking-mode 模型给 120s——multi-turn 深度推理时模型可能 30+s 才出第一个 chunk，
 * SDK 在 reasoning 阶段不一定 yield event，所以哪怕底层 SSE 在流也可能看起来"空转"。
 */
export function streamIdleTimeoutMsForModel(modelId: string): number {
  return isThinkingModeModel(modelId) ? 120_000 : 30_000;
}

export function cryptoRandomShort(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * 判断 OpenAI / 兼容 endpoint 抛出的错误是否属于 context length 溢出。
 * OpenAI 的标准 code 是 'context_length_exceeded'；兜底也匹配中英文常见措辞。
 */
export function isContextLengthError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('context_length_exceeded') ||
    lower.includes('maximum context length') ||
    lower.includes('context length') ||
    lower.includes('too many tokens')
  );
}

export function isMaxTurnsError(msg: string): boolean {
  return /max turns\s*\(\d+\)\s*exceeded/i.test(msg);
}

/**
 * mimo / DeepSeek 等"thinking mode 推理模型"在多轮 tool calling 时要求
 * 把上一轮 assistant 消息的 reasoning_content 字段回传，否则 400。
 * OpenAI Agents SDK 不知道这个私有字段会把它丢掉 → 第二轮调用挂掉。
 *
 * mimo 的 400 响应：
 *   { error: { message: "Param Incorrect", param: "The reasoning_content in
 *              the thinking mode must be passed back to the API." } }
 * OpenAI SDK 把 message 当 baseMsg、把整个 body.error 挂到 (err as APIError).error。
 * 必须同时检测 message **和** error.param，否则 baseMsg 只有 "Param Incorrect"
 * 检测漏掉。
 */
export function isReasoningContentError(error: unknown, msg: string): boolean {
  if (msg.toLowerCase().includes('reasoning_content')) return true;
  if (msg.toLowerCase().includes('thinking mode')) return true;
  const e = error as { error?: { param?: unknown; message?: unknown } };
  const param = typeof e?.error?.param === 'string' ? e.error.param.toLowerCase() : '';
  if (param.includes('reasoning_content') || param.includes('thinking mode')) return true;
  return false;
}
