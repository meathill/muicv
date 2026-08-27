import type { Context } from 'hono';

import {
  computeLlmCharge,
  insufficientBalanceError,
  isSupportedLlmModel,
  LLM_PRICING,
  type LlmUpstream,
  MuirouterOauthError,
  SUPPORTED_LLM_MODELS,
} from '@muicv/shared';

import {
  extractUsageFromResponsesJson,
  extractUsageFromResponsesSseStream,
  extractUsageFromSseStream,
  stripUsageChunkFromSse,
} from '../lib/llm-usage.ts';
import { getMuirouterUpstreamCreds } from '../lib/muirouter-token.ts';
import { charge, ensureBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * /llm/v1/* —— OpenAI 兼容反向代理。
 *
 * 三种上游路径（按 muicv 平台余额优先 + 计费表 upstream 字段分流）：
 *   1. **平台 OpenAI**：余额 > 0 + 表内 gpt-5.6-* → worker secret OPENAI_API_KEY，
 *      上游 https://api.openai.com/v1，按 model 分价扣费（见 shared LLM_PRICING）。
 *      premium 升级档，支持 /v1/responses 与 reasoning effort。
 *   2. **平台 OpenCode Go**：余额 > 0 + 表内 deepseek-v4-flash / mimo-v2.5 →
 *      worker secret OPENCODE_GO_API_KEY，上游 https://opencode.ai/zen/go/v1
 *      （包月订阅，成本锁死）。只暴露 chat/completions；/v1/responses 直接 400 挡掉。
 *   3. **muirouter fallback**：余额 = 0 + 用户绑了 muirouter → 解密 access_token
 *      转发到 https://api.muirouter.com，**不扣 muicv 余额**（用户自己的 muirouter
 *      钱包扣）；客户端没指定 model 时注入用户的 defaultModel。
 *   4. **都没有**：余额 = 0 且没绑 muirouter → 402 insufficient_balance。
 *
 * 平台路径（1+2）只接受 LLM_PRICING 表里的 model 且按表里 upstream 字段选上游；
 * 表外 model（含已下架的 gpt-5.4 / mimo-v2.5-pro）→ 400 unsupported_model。
 * Xiaomi（token-plan-cn）completion 直连已退役——小米侧现在只剩 TTS（lib/tts.ts）。
 *
 * Path 映射：/llm/v1/{chat/completions|responses} → <upstream>/v1/...。
 * `/v1/responses` 是 OpenAI reasoning 模型必经端点（function tools + reasoning_effort
 * 在 chat_completions 端不支持）；OpenCode Go 目录只承诺 chat/completions，
 * 所以 responses 请求打到 opencode-go 上游时在这里直接挡掉，不转发猜 404。
 */

const OPENAI_BASE = 'https://api.openai.com';
// 注意不带尾缀 /v1：handler 统一拼 upstreamPath（=/v1/chat/completions 等）
const OPENCODE_GO_BASE = 'https://opencode.ai/zen/go';
const MUIROUTER_BASE = 'https://api.muirouter.com';

const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';
const RESPONSES_PATH = '/v1/responses';

type ResolvedPlatformUpstream = {
  key: string | undefined;
  base: string;
  missingErr: 'openai-key-missing' | 'opencode-go-key-missing';
  /** 是否支持 /v1/responses 端点 */
  supportsResponses: boolean;
};

/** 按计费表的 upstream 字段解析平台上游。key 取自 worker secrets，缺了由 caller 报错。 */
function resolvePlatformUpstream(
  upstream: LlmUpstream,
  env: { OPENAI_API_KEY?: string; OPENCODE_GO_API_KEY?: string },
): ResolvedPlatformUpstream {
  if (upstream === 'opencode-go') {
    return {
      key: env.OPENCODE_GO_API_KEY,
      base: OPENCODE_GO_BASE,
      missingErr: 'opencode-go-key-missing',
      supportsResponses: false,
    };
  }
  return {
    key: env.OPENAI_API_KEY,
    base: OPENAI_BASE,
    missingErr: 'openai-key-missing',
    supportsResponses: true,
  };
}

export async function handleLlmProxy(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const wallet = await ensureBalance(c.env, userId);

  // 先 peek body 拿 model，platform 路径要据此分上游 + 校验是否支持。
  const incoming = new URL(c.req.url);
  const upstreamPath = incoming.pathname.replace(/^\/llm\//, '/');
  const isChatCompletions = upstreamPath === CHAT_COMPLETIONS_PATH;
  const isResponses = upstreamPath === RESPONSES_PATH;
  const isLlmGeneration = isChatCompletions || isResponses;

  let bodyText: string | null = null;
  let parsedBody: { stream?: boolean; stream_options?: { include_usage?: boolean }; model?: string } | null = null;
  let isStreaming = false;
  let clientWantedUsage = false;

  if (isLlmGeneration && c.req.method === 'POST') {
    bodyText = await c.req.text();
    try {
      parsedBody = JSON.parse(bodyText);
      isStreaming = parsedBody?.stream === true;
      // include_usage 只在 chat_completions 有意义；responses 默认就在 response.completed 事件带 usage
      if (isChatCompletions && parsedBody?.stream_options?.include_usage === true) {
        clientWantedUsage = true;
      }
    } catch {
      // 非 JSON body，透传让上游报错
    }
  }

  let upstreamBase: string;
  let upstreamKey: string;
  let isPlatform: boolean;
  let injectedModel: string | null = null;

  if (wallet.balance > 0) {
    // 平台路径：chat/completions + responses 必须带支持的 model；其它端点（/v1/models 等）默认走 OpenAI。
    if (isLlmGeneration) {
      const model = parsedBody?.model;
      if (typeof model !== 'string' || !isSupportedLlmModel(model)) {
        return c.json(
          {
            error: 'unsupported_model',
            message: `model "${model ?? ''}" 不在平台支持列表里，请改成下列之一`,
            supported: SUPPORTED_LLM_MODELS,
          },
          400,
        );
      }
      // isSupportedLlmModel 已通过 → 表里必有该条，upstream 字段决定走谁
      const pricing = LLM_PRICING[model];
      if (!pricing) {
        return c.json(
          {
            error: 'unsupported_model',
            message: `model "${model}" 不在平台支持列表里，请改成下列之一`,
            supported: SUPPORTED_LLM_MODELS,
          },
          400,
        );
      }
      const provider = resolvePlatformUpstream(pricing.upstream, c.env);
      // OpenCode Go 目录只承诺 chat/completions；responses 直接挡掉避免转发猜 404
      if (isResponses && !provider.supportsResponses) {
        return c.json(
          {
            error: 'unsupported_endpoint',
            message: `model "${model}" 走 OpenCode Go 上游，不支持 /v1/responses，请用 /v1/chat/completions`,
          },
          400,
        );
      }
      if (!provider.key) {
        return c.json(
          {
            error: provider.missingErr,
            message:
              provider.missingErr === 'opencode-go-key-missing'
                ? '后端没配 OPENCODE_GO_API_KEY（部署人员需要 wrangler secret put）'
                : '后端没配 OPENAI_API_KEY（部署人员需要 wrangler secret put）',
          },
          500,
        );
      }
      upstreamBase = provider.base;
      upstreamKey = provider.key;
    } else {
      // /v1/models 这类无 body 端点：默认 OpenAI，让客户端能正常列模型
      const platformKey = c.env.OPENAI_API_KEY;
      if (!platformKey) {
        return c.json({ error: 'openai-key-missing', message: '后端没配 OPENAI_API_KEY' }, 500);
      }
      upstreamBase = OPENAI_BASE;
      upstreamKey = platformKey;
    }
    isPlatform = true;
  } else {
    let creds;
    try {
      creds = await getMuirouterUpstreamCreds(c.env, userId);
    } catch (err) {
      const reason = err instanceof MuirouterOauthError ? err.code : 'token-refresh-failed';
      return c.json({ error: reason, message: 'muirouter access_token 续期失败，请回 dashboard 重新关联' }, 502);
    }
    if (!creds) {
      return c.json(insufficientBalanceError(wallet.balance), 402);
    }
    upstreamBase = MUIROUTER_BASE;
    upstreamKey = creds.accessToken;
    injectedModel = creds.defaultModel;
    isPlatform = false;
  }

  const upstreamUrl = `${upstreamBase}${upstreamPath}${incoming.search}`;

  // body 修改：
  //   - chat_completions 平台路径 stream 时注入 include_usage 用于聚合扣账；
  //   - responses 端点不需要 include_usage（usage 必在 response.completed 事件里）；
  //   - muirouter 路径在客户端没传 model 时注入 defaultModel（两端通用）。
  if (isLlmGeneration && c.req.method === 'POST' && parsedBody) {
    let mutated = false;

    if (isChatCompletions && isPlatform && isStreaming) {
      if (parsedBody.stream_options?.include_usage !== true) {
        parsedBody.stream_options = { ...(parsedBody.stream_options ?? {}), include_usage: true };
        mutated = true;
      }
    }

    if (!isPlatform && injectedModel) {
      const m = parsedBody.model;
      if (typeof m !== 'string' || m.length === 0 || m === 'auto' || m === 'default') {
        parsedBody.model = injectedModel;
        mutated = true;
      }
    }

    if (mutated) {
      bodyText = JSON.stringify(parsedBody);
    }
  }

  // 构造上游 headers
  const upstreamHeaders = new Headers();
  for (const [k, v] of c.req.raw.headers.entries()) {
    const lower = k.toLowerCase();
    if (
      lower === 'authorization' ||
      lower === 'host' ||
      lower === 'content-length' ||
      lower === 'connection' ||
      lower === 'cf-connecting-ip' ||
      lower.startsWith('cf-') ||
      lower === 'x-forwarded-for' ||
      lower === 'x-forwarded-proto' ||
      lower === 'x-real-ip'
    ) {
      continue;
    }
    upstreamHeaders.set(k, v);
  }
  upstreamHeaders.set('Authorization', `Bearer ${upstreamKey}`);

  // 发起 fetch
  let upstreamRes: Response;
  try {
    const init: RequestInit & { duplex?: 'half' } = {
      method: c.req.method,
      headers: upstreamHeaders,
    };
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      init.body = bodyText !== null ? bodyText : c.req.raw.body;
      init.duplex = 'half';
    }
    upstreamRes = await fetch(upstreamUrl, init);
  } catch (error) {
    return c.json(
      {
        error: 'upstream-network-error',
        upstream: isPlatform ? 'platform' : 'muirouter',
        message: error instanceof Error ? error.message : '上游网络错误',
      },
      502,
    );
  }

  // 响应处理
  const responseHeaders = new Headers();
  for (const [k, v] of upstreamRes.headers.entries()) {
    const lower = k.toLowerCase();
    if (lower === 'content-encoding' || lower === 'transfer-encoding' || lower === 'connection') continue;
    responseHeaders.set(k, v);
  }

  // muirouter 不扣账；上游 4xx/5xx 不扣账；非 LLM 生成端点（如 /v1/models）不扣账
  if (!isPlatform || upstreamRes.status >= 400 || !isLlmGeneration) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  }

  const model = parsedBody?.model ?? 'unknown';

  if (isStreaming && upstreamRes.body) {
    const [a, b] = upstreamRes.body.tee();
    const usagePromise = isResponses ? extractUsageFromResponsesSseStream(b) : extractUsageFromSseStream(b);
    c.executionCtx.waitUntil(
      usagePromise.then(async (usage) => {
        if (!usage) return;
        const cachedTokens = usage.cached_tokens ?? 0;
        const cost = computeLlmCharge(model, usage.prompt_tokens, usage.completion_tokens, cachedTokens);
        if (cost == null) return;
        await charge(c.env, userId, cost, 'llm', {
          model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          cachedTokens,
        }).catch(() => {});
      }),
    );

    // responses 流不需要 strip——usage 事件本来就是契约的一部分；
    // chat_completions 当客户端没主动声明 include_usage 时把我们偷偷注入的那个 chunk 吞掉
    const outBody = isResponses ? a : clientWantedUsage ? a : stripUsageChunkFromSse(a);
    return new Response(outBody, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  }

  // 非 stream：buffer 响应、读 usage、扣账
  const text = await upstreamRes.text();
  try {
    const json = JSON.parse(text);
    const usage = isResponses
      ? extractUsageFromResponsesJson(json)
      : json?.usage?.prompt_tokens != null && json?.usage?.completion_tokens != null
        ? {
            prompt_tokens: json.usage.prompt_tokens as number,
            completion_tokens: json.usage.completion_tokens as number,
            cached_tokens: (json.usage.prompt_tokens_details?.cached_tokens ?? 0) as number,
          }
        : null;
    if (usage) {
      const chargedModel = json?.model ?? model;
      const cost = computeLlmCharge(chargedModel, usage.prompt_tokens, usage.completion_tokens, usage.cached_tokens);
      if (cost != null) {
        c.executionCtx.waitUntil(
          charge(c.env, userId, cost, 'llm', {
            model: chargedModel,
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            cachedTokens: usage.cached_tokens ?? 0,
          })
            .then(() => {})
            .catch(() => {}),
        );
      }
    }
  } catch {
    // 不是 JSON，跳过扣账（不太可能，但容错）
  }
  return new Response(text, {
    status: upstreamRes.status,
    headers: responseHeaders,
  });
}
