/**
 * thinking-mode 推理模型（mimo / DeepSeek 系）在多轮 tool calling 时要求**每一条带
 * tool_calls 的 assistant message** 都要伴随 reasoning_content；OpenAI Agents SDK
 * 走 chat_completions 时不识别这个非标准字段会直接丢掉 → 400 `Param Incorrect`。
 *
 *   Response 侧：thinking-mode streaming response → body.tee() 后台读 SSE，
 *                每轮累计 delta.reasoning_content 推入 reasoningQueue 末尾
 *   Request 侧：thinking-mode 下次请求出去前，遍历 body.messages 里所有 assistant
 *                从队尾对齐注入（FIFO：reasoningQueue[0] → 倒数第 queue.length 条）
 *
 * 触发条件：`isThinkingModeModel(modelId)` 白名单（当前 mimo-* / deepseek-*）。
 * 新增 thinking-mode 模型时把前缀加进去即可——本来就要在 pricing.ts 的
 * LLM_DISPLAY_META 里登记新模型，顺手维护这一处零成本，避免对 GPT 请求做无用的
 * tee + SSE 解析。
 *
 * 并发假设：SDK 在一次 run() 内严格串行调用 fetch（等 stream 流完 + tool 跑完
 * 才发下一轮），队列推入和读取不会并发。每次 runAgent 起点调
 * `resetReasoningState()` 清队列，避免跨 run 残留。
 *
 * 上游参考：https://github.com/openai/openai-agents-js/pull/792（DeepSeek 同款问题，
 * 但仅在 agents-extensions 的 aisdk 路径修，chat_completions 路径未修——若哪天
 * 上游覆盖了，可以删掉这层）。
 */

type ReasoningCapture = { model: string; content: string };
let reasoningQueue: ReasoningCapture[] = [];

/**
 * 实时 reasoning_content delta 监听器。runAgent 启动时设置（转发到 send），
 * 结束时清空。模块级单 slot：依赖 SDK 单 run 内串行——多 channel 并发场景里
 * 可能串台，但当前架构用户不会同时跑两个 agent。
 */
let reasoningDeltaListener: ((delta: string) => void) | null = null;
let currentSessionId: string | null = null;

/** runAgent 调用前清队列，避免上一轮 run 的 reasoning 错位注入本轮 assistant。 */
export function resetReasoningState(): void {
  reasoningQueue = [];
}

export function setReasoningDeltaListener(fn: ((delta: string) => void) | null): void {
  reasoningDeltaListener = fn;
}

/** 注入当前 run 的会话 ID（由 runtime 在 runAgent 启动时配置），供 OpenCode Go 会话亲和与请求路由使用。 */
export function setRunSessionId(sessionId: string | null): void {
  currentSessionId = sessionId;
}

/**
 * 是否是带 thinking mode 的推理模型——同时控制两件事：
 *   1. reasoning_content 透传层是否启用（tap streaming + inject 到 messages）
 *   2. watchdog timeout 长度（thinking 模型 120s vs 普通 30s）
 *
 * 新增 thinking 模型时把前缀加这里——本来就要登记到 pricing.ts 的 LLM_DISPLAY_META，
 * 顺手改一行零成本。
 */
export function isThinkingModeModel(modelId: unknown): modelId is string {
  if (typeof modelId !== 'string') return false;
  return modelId.startsWith('mimo-') || modelId.startsWith('deepseek-');
}

/**
 * OpenAI SDK 自定义 fetch wrapper，承担三件事：
 *   1. non-ok 响应时打印完整 body + 请求摘要（mimo / muirouter 经常返回 400
 *      "Param Incorrect" 之类语义稀薄的错误，没这层日志根本看不出哪个 param 不对）
 *   2. thinking-mode reasoning_content 双向透传（见本文件顶部注释）
 *   3. 会话 header（x-opencode-session）与客户端 User-Agent 注入
 *
 * 注意：req body 可能含敏感内容（用户对话原文），日志只截 1.5KB 摘要。
 */
export async function loggingFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (currentSessionId) {
    if (!headers.has('x-opencode-session')) headers.set('x-opencode-session', currentSessionId);
    if (!headers.has('x-session-id')) headers.set('x-session-id', currentSessionId);
  }
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (urlStr.includes('opencode.ai') && !headers.has('x-opencode-session')) {
    headers.set('x-opencode-session', currentSessionId || 'muicv-app-session');
  }
  const ua = headers.get('user-agent');
  if (!ua || ua.includes('node-fetch') || ua.includes('OpenAI/')) {
    headers.set('user-agent', 'muicv-app/1.0');
  }

  // Request 侧：队列非空 → 从队尾对齐注入到 body.messages 末尾 N 条 assistant
  // body.messages 里 assistant 分两类：
  //   - 历史完成态：从持久化 ChatMessage[] 经 history.toItem 重建，无 tool_calls，不要求 reasoning
  //   - 本轮新生成：SDK 在 run() 内部按 turn 累计，有 tool_calls，强制要求 reasoning
  // 队列长度 = 本轮已完成的 turn 数 = 末尾 N 条新 assistant。从队尾对齐：
  //   reasoningQueue[0] → 倒数第 queue.length 条 assistant
  //   reasoningQueue[i] → 倒数第 (queue.length - i) 条 assistant
  let mutatedInit: RequestInit = { ...(init ?? {}), headers };
  if (init?.body && typeof init.body === 'string' && reasoningQueue.length > 0) {
    try {
      const body = JSON.parse(init.body);
      if (isThinkingModeModel(body.model) && Array.isArray(body.messages)) {
        const assistantIndices: number[] = [];
        for (let i = 0; i < body.messages.length; i++) {
          const msg = body.messages[i];
          if (msg && typeof msg === 'object' && msg.role === 'assistant') assistantIndices.push(i);
        }
        const offset = assistantIndices.length - reasoningQueue.length;
        let injected = 0;
        if (offset >= 0) {
          for (let i = 0; i < reasoningQueue.length; i++) {
            const slot = reasoningQueue[i];
            if (!slot || slot.model !== body.model) continue;
            const target = assistantIndices[offset + i];
            if (target == null) continue;
            (body.messages[target] as Record<string, unknown>).reasoning_content = slot.content;
            injected++;
          }
        }
        if (injected > 0) {
          mutatedInit = { ...mutatedInit, body: JSON.stringify(body) };
        }
      }
    } catch {
      /* 非 JSON body 不动 */
    }
  }

  const res = await fetch(input, mutatedInit);

  if (!res.ok) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const cloned = res.clone();
    const body = await cloned.text().catch(() => '<read body failed>');
    const reqBody = typeof mutatedInit?.body === 'string' ? mutatedInit.body.slice(0, 1500) : '<non-string body>';
    console.error(
      `[OpenAI fetch] ${res.status} ${res.statusText} ${url}\n  resp body: ${body.slice(0, 2000)}\n  req body (≤1500): ${reqBody}`,
    );
  }

  // Response 侧：thinking-mode streaming 响应 → tee 一份流到后台 tap 抓
  // delta.reasoning_content。仅对 isThinkingModeModel 触发，避免给 GPT 这类
  // 没 reasoning_content 字段的模型做无用的 tee + JSON.parse。
  const reqModel = extractModelFromRequestBody(mutatedInit?.body);
  const isStream = res.ok && !!res.body && (res.headers.get('content-type') ?? '').includes('text/event-stream');
  if (isStream && isThinkingModeModel(reqModel)) {
    const [streamForSDK, streamForUs] = res.body!.tee();
    tapReasoningStream(streamForUs, reqModel).catch((err) => {
      console.warn('[reasoning tap] failed:', err);
    });
    return new Response(streamForSDK, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  return res;
}

function extractModelFromRequestBody(body: unknown): string | null {
  if (typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body) as { model?: unknown };
    return typeof parsed.model === 'string' ? parsed.model : null;
  } catch {
    return null;
  }
}

/**
 * 后台读 SSE stream，按 OpenAI streaming 格式逐 chunk 解析，累计
 * `choices[0].delta.reasoning_content`，整段存到 pendingReasoning。
 *
 * SDK 在同一 run 内严格串行（等本轮 stream 完 + tool 跑完才发下一轮），
 * 所以 tap 一定在下一轮 request 前完成，缓存写入有 happens-before 保证。
 */
async function tapReasoningStream(stream: ReadableStream<Uint8Array>, model: string): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let acc = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as { choices?: Array<{ delta?: Record<string, unknown> }> };
            const rc = json.choices?.[0]?.delta?.reasoning_content;
            if (typeof rc === 'string' && rc.length > 0) {
              acc += rc;
              reasoningDeltaListener?.(rc);
            }
          } catch {
            /* 半包 / 非 JSON 行忽略 */
          }
        }
      }
    }
    if (acc) reasoningQueue.push({ model, content: acc });
  } finally {
    reader.releaseLock();
  }
}
