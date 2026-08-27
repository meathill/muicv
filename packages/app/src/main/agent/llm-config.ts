import { setDefaultOpenAIClient, setDefaultOpenAIKey, setOpenAIAPI } from '@openai/agents';
import OpenAI from 'openai';

import type { AppConfig } from '../../shared/types.ts';
import { isThinkingModeModel, loggingFetch } from './reasoning-capture.ts';

/**
 * 配置 OpenAI Agents SDK 全局 client，让它走 muicv API 的 OpenAI 兼容代理：
 *
 *   electron → POST ${muicvApiBase}/llm/v1/{chat/completions|responses}
 *           Authorization: Bearer mui_xxx
 *      muicv worker requireApiKey → 按余额走平台 OpenAI / Xiaomi 上游，
 *           或 fallback 转发到 https://api.muirouter.com/v1
 *
 * 这样：
 *   - 桌面 app 只需要 mui_ key 一个凭证
 *   - LLM 调用统一被 muicv 后端审计 / 计费 / 路由
 *   - 用户付费档位 (Free/Pro/Max) + BYOK 状态完全由 muicv 后端控制，
 *     电脑端不需要知道
 *
 * Endpoint 分流（每次 runAgent 起点 selectOpenAIAPI 决策）：
 *   - mimo / deepseek 系 thinking-mode 模型 → chat_completions（reasoning_content
 *     双向透传依赖 chat_completions SSE 解析，见 reasoning-capture.ts）
 *   - 自带 customLlmBase 的第三方 OpenAI 兼容代理（Groq/Together 等） →
 *     chat_completions（这些代理普遍没实现 /v1/responses）
 *   - 其余（含 OpenAI gpt-5.x 等 reasoning 模型） → responses
 *     （function tools + reasoning_effort 在 chat_completions 端会被官方 400 拒绝）
 */
let configuredKey: string | null = null;
let configuredBase: string | null = null;
/** 最近一次 configureLlmForRun 选定的 endpoint 形态。runtime 据此决定 reasoning effort 的注入字段名。 */
let configuredAPI: 'chat_completions' | 'responses' = 'responses';

/** 当前 run 使用的 OpenAI 端点形态（configureLlmForRun 之后读取才有意义）。 */
export function currentOpenAIAPI(): 'chat_completions' | 'responses' {
  return configuredAPI;
}

/**
 * 决定这次 run 用谁的 endpoint：
 *
 *   1. 如果用户配了自带的 LLM endpoint + key（customLlmBase / customLlmKey），
 *      直接打那个 endpoint —— "自带 AI 余额"模式，跳过 muicv 平台代理。
 *   2. 否则走 muicv 平台代理（${muicvApiBase}/llm/v1），由 muicv 后端按账号
 *      档位 / muirouter BYOK 路由。
 *
 * 没 key 也没自带 endpoint = 不能用，返回 false。
 */
function ensureConfigured(config: AppConfig): boolean {
  let baseURL: string;
  let apiKey: string;

  if (config.customLlmKey && config.customLlmBase) {
    baseURL = config.customLlmBase.replace(/\/$/, '');
    apiKey = config.customLlmKey;
  } else if (config.muicvApiKey) {
    baseURL = `${config.muicvApiBase.replace(/\/$/, '')}/llm/v1`;
    apiKey = config.muicvApiKey;
  } else {
    return false;
  }

  if (configuredKey === apiKey && configuredBase === baseURL) return true;
  setDefaultOpenAIKey(apiKey);
  setDefaultOpenAIClient(new OpenAI({ apiKey, baseURL, fetch: loggingFetch }));
  configuredKey = apiKey;
  configuredBase = baseURL;
  return true;
}

/**
 * 按模型 + 用户 endpoint 决定走 chat_completions 还是 responses。
 *
 * 在每次 runAgent 起点都跑一次（不可缓存）——同一个 muicv key 可能在不同 run 之间
 * 切换 model（用户去设置改），endpoint 必须跟着 model 变。
 */
function selectOpenAIAPI(config: AppConfig): 'chat_completions' | 'responses' {
  if (config.customLlmBase && config.customLlmKey) return 'chat_completions';
  if (isThinkingModeModel(config.defaultModel)) return 'chat_completions';
  return 'responses';
}

/**
 * runAgent 起点统一调一次：装好 OpenAI client + endpoint。
 * 返回 false 表示用户没配 muicv key 也没配自带 LLM，本轮 run 无法启动。
 */
export function configureLlmForRun(config: AppConfig): boolean {
  if (!ensureConfigured(config)) return false;
  configuredAPI = selectOpenAIAPI(config);
  setOpenAIAPI(configuredAPI);
  return true;
}
