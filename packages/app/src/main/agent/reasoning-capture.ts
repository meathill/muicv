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
let activeTapPromise: Promise<void> | null = null;

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
  activeTapPromise = null;
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

  // 若上一轮流的后台 tap 尚未消费完毕，先等待结束，确保 reasoningQueue 就绪无竞态
  if (activeTapPromise) {
    try {
      await activeTapPromise;
    } catch {
      /* 忽略 tap 内部已处理的异常 */
    }
  }

  // Request 侧：为 thinking-mode 模型确保所有 assistant 消息都带 reasoning_content
  // DeepSeek / OpenCode Go 在 thinking mode 下，要求每一条 assistant message（尤其是带 tool_calls 的）
  // 必须把 reasoning_content 字段传回，否则返回 400 "The reasoning_content in the thinking mode must be passed back to the API."
  let mutatedInit: RequestInit = { ...(init ?? {}), headers };
  if (init?.body && typeof init.body === 'string') {
    try {
      const body = JSON.parse(init.body);
      if (isThinkingModeModel(body.model) && Array.isArray(body.messages)) {
        const assistantIndices: number[] = [];
        for (let i = 0; i < body.messages.length; i++) {
          const msg = body.messages[i];
          if (msg && typeof msg === 'object' && msg.role === 'assistant') assistantIndices.push(i);
        }

        const offset = Math.max(0, assistantIndices.length - reasoningQueue.length);
        const queueStart = Math.max(0, reasoningQueue.length - assistantIndices.length);

        for (let i = 0; i < assistantIndices.length; i++) {
          const target = assistantIndices[i];
          if (target === undefined) continue;
          const assistantMsg = body.messages[target] as Record<string, unknown> | undefined;
          if (!assistantMsg) continue;

          if (i >= offset) {
            const queueIdx = queueStart + (i - offset);
            const slot = reasoningQueue[queueIdx];
            if (slot && typeof slot.content === 'string') {
              assistantMsg.reasoning_content = slot.content;
              continue;
            }
          }

          // 兜底：若该 assistant 未被队列匹配或缺失，补上空字符串，防止上游 400 校验失败
          if (assistantMsg.reasoning_content === undefined) {
            assistantMsg.reasoning_content = '';
          }
        }

        mutatedInit = { ...mutatedInit, body: JSON.stringify(body) };
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

  // Response 侧：thinking-mode 响应处理
  const reqModel = extractModelFromRequestBody(mutatedInit?.body);
  const isStream = res.ok && !!res.body && (res.headers.get('content-type') ?? '').includes('text/event-stream');
  if (isStream && isThinkingModeModel(reqModel)) {
    const [streamForSDK, streamForUs] = res.body!.tee();
    activeTapPromise = tapReasoningStream(streamForUs, reqModel)
      .catch((err) => {
        console.warn('[reasoning tap] failed:', err);
      })
      .finally(() => {
        activeTapPromise = null;
      });
    return new Response(streamForSDK, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  // 非 stream 响应：若为 thinking-mode，读 choices[0].message.reasoning_content 并推入队列
  if (res.ok && isThinkingModeModel(reqModel)) {
    try {
      const cloned = res.clone();
      const json = (await cloned.json()) as {
        choices?: Array<{ message?: Record<string, unknown> }>;
      };
      const msg = json.choices?.[0]?.message;
      const rc = msg?.reasoning_content ?? msg?.reasoning;
      reasoningQueue.push({ model: reqModel, content: typeof rc === 'string' ? rc : '' });
    } catch {
      /* 非 JSON 忽略 */
    }
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
      // 标准化换行符，避免 \r\n\r\n 导致 indexOf('\n\n') 找不到事件边界
      buf = buf.replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: Array<{
                delta?: Record<string, unknown>;
                message?: Record<string, unknown>;
              }>;
            };
            const delta = json.choices?.[0]?.delta;
            const rc = delta?.reasoning_content ?? delta?.reasoning;
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
    // 处理末尾剩余未以双换行结尾的 buffer
    if (buf) {
      for (const line of buf.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload) as { choices?: Array<{ delta?: Record<string, unknown> }> };
          const delta = json.choices?.[0]?.delta;
          const rc = delta?.reasoning_content ?? delta?.reasoning;
          if (typeof rc === 'string' && rc.length > 0) {
            acc += rc;
            reasoningDeltaListener?.(rc);
          }
        } catch {
          /* 忽略 */
        }
      }
    }
    // 即使 acc 为空也入队，确保与 turn 轮次对齐
    reasoningQueue.push({ model, content: acc });
  } finally {
    reader.releaseLock();
  }
}
