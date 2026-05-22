import type { WebContents } from 'electron';

import { Agent, run } from '@openai/agents';

import { randomUUID } from 'node:crypto';

import { modelSupportsAudioInput, modelSupportsVision } from '@muicv/shared';

import type { AgentChunk, AppConfig, ChatMessage, ConversationType, ToolCallRecord } from '../../shared/types.ts';
import { getConversation, saveConversation } from '../conversations.ts';
import { buildSttTools } from './api-tools-stt.ts';
import { buildSyncTools } from './api-tools-sync.ts';
import { buildApiTools } from './api-tools.ts';
import { buildAgentInput, getModelBudget } from './history.ts';
import { configureLlmForRun } from './llm-config.ts';
import { readAudioAsBase64, readImageAsDataUrl } from './multimodal.ts';
import { resetReasoningState, setReasoningDeltaListener } from './reasoning-capture.ts';
import { buildSystemPrompt } from './skills.ts';
import {
  AGENT_MAX_TURNS,
  cryptoRandomShort,
  isContextLengthError,
  isMaxTurnsError,
  isReasoningContentError,
  streamIdleTimeoutMsForModel,
} from './stream-helpers.ts';
import { type ArtifactEmitter, buildFileTools } from './tools.ts';

const activeRuns = new Map<string, AbortController>();

type RunOpts = {
  channelId: string;
  profileId: string;
  convId: string;
  type: ConversationType;
  messages: ChatMessage[];
  config: AppConfig;
  sender: WebContents;
};

/**
 * 启动一次 agent 流式 run。每个 chunk 通过 sender.send('agent:chunk', channelId, payload)
 * 转发到 renderer。run 结束时把整份 conversation flush 到磁盘。
 */
export async function runAgent(opts: RunOpts): Promise<void> {
  const { channelId, profileId, convId, type, messages, config, sender } = opts;

  const send = (chunk: AgentChunk) => {
    if (!sender.isDestroyed()) sender.send('agent:chunk', channelId, chunk);
  };

  if (!config.workspaceDir) {
    send({ type: 'error', message: 'NO_PROFILE' });
    send({ type: 'finish', reason: 'error' });
    return;
  }
  const workspaceDir = config.workspaceDir;
  if (!configureLlmForRun(config)) {
    send({ type: 'error', message: 'NOT_LOGGED_IN' });
    send({ type: 'finish', reason: 'error' });
    return;
  }
  // 清掉上一轮 run 残留的 reasoning 队列，避免序号错位注入本轮 assistant
  resetReasoningState();
  // 把推理过程实时转发给 renderer，让 UI 展示真正的"思考中"内容而不是静态提示
  // 仅 thinking-mode 模型实际会触发，普通模型 stream 里没 reasoning_content 字段
  setReasoningDeltaListener((delta) => send({ type: 'reasoning-delta', delta }));

  // artifact 收集：tool 调用过程中累计 artifact，完成后塞进 assistant message
  const collectedArtifacts: Array<import('../../shared/types.ts').ArtifactRef> = [];
  const emitArtifact: ArtifactEmitter = (a) => {
    collectedArtifacts.push(a);
    send({ type: 'artifact', ...a });
  };

  const tools = [
    ...buildFileTools(config.workspaceDir, emitArtifact),
    ...buildApiTools(config, emitArtifact),
    ...buildSyncTools(config),
    ...buildSttTools(config, sender),
  ];
  const agent = new Agent({
    name: 'Mui简历',
    instructions: buildSystemPrompt(type),
    model: config.defaultModel,
    tools,
  });

  const lastUser = messages[messages.length - 1];
  if (!lastUser || lastUser.role !== 'user') {
    send({ type: 'error', message: '内部错误：最后一条消息不是 user' });
    send({ type: 'finish', reason: 'error' });
    return;
  }

  // 前置落盘 user msg：dev 重启 / 主进程崩 / 网络挂在 stream 中段时，
  // 至少保住用户刚敲的这条；flushConversation 末尾按 id 幂等不会重复 push。
  try {
    const convNow = await getConversation(profileId, convId);
    if (convNow) {
      const tail = convNow.messages[convNow.messages.length - 1];
      if (tail?.id !== lastUser.id) {
        convNow.messages.push(lastUser);
        await saveConversation(convNow);
      }
    }
  } catch (err) {
    console.error('[agent runtime] persist user msg failed', err);
  }

  // Vision 能力分支：模型路由到的 endpoint 不收图（如 mimo 系走 muirouter →
  // OpenRouter 没勾 image capability，见 issue #7）时，**不再硬错**——v0.4.x 起
  // 图片有第二种用途（upload_photo agent tool 上传证件照到 R2），不需要 vision。
  // 仅在 model 支持 vision 时把图 base64 进 input_image；不支持就跳过 imageReader，
  // 让 footer 的"调 upload_photo"提示引导 agent 走 R2 上传路径。
  const supportsVision = modelSupportsVision(config.defaultModel);
  // Audio 直通：mimo-v2.5（全模态版）原生听音频，把 wav 以 Xiaomi 规范的
  // wav 裸 base64 灌进 Agents SDK audio content block，跳过 Whisper STT。
  // 其它 model 维持现状（chatbox 麦克风走 recordAndTranscribe → 转写文本）。
  const supportsAudio = modelSupportsAudioInput(config.defaultModel);

  // 把历史按 SDK 原生 AgentInputItem[] 组装，并按 token budget 做滑动窗口裁剪。
  // 历史里所有 user message 的图都重新 base64 进 input_image content block——
  // Claude Code 模式：每轮带全部历史图，靠底层 LLM 的 prompt cache 抵成本。
  // 见 history.ts 的 buildAgentInput 注释。
  const {
    items: input,
    droppedCount,
    estimatedTokens,
  } = await buildAgentInput(messages, {
    budgetTokens: getModelBudget(config.defaultModel),
    ...(supportsVision ? { imageReader: (ref) => readImageAsDataUrl(workspaceDir, ref) } : {}),
    ...(supportsAudio ? { audioReader: (ref) => readAudioAsBase64(workspaceDir, ref) } : {}),
  });
  if (droppedCount > 0) {
    console.log(
      `[agent runtime] context trimmed: dropped ${droppedCount} oldest messages, ~${estimatedTokens} tokens kept`,
    );
  }

  const abort = new AbortController();
  activeRuns.set(channelId, abort);

  // 提到 try 外面，让 error / abort 路径也能拿到部分输出存盘
  let assistantText = '';
  const assistantToolCalls: ToolCallRecord[] = [];

  // 空转看门狗：stream open 后 N 秒内没收到任何 event（mimo / 第三方代理偶发
  // silent hang），主动 abort 并报错，避免 UI 永远卡在"思考中"。任何 event 到达
  // 就 reset 计时。timeout 长度按 model 类型决定，见 stream-helpers.ts。
  const STREAM_IDLE_TIMEOUT_MS = streamIdleTimeoutMsForModel(config.defaultModel);
  let lastEventAt = Date.now();
  let timedOut = false;
  const watchdog = setInterval(() => {
    if (Date.now() - lastEventAt > STREAM_IDLE_TIMEOUT_MS) {
      timedOut = true;
      console.warn(`[agent runtime] stream silent > ${STREAM_IDLE_TIMEOUT_MS}ms, aborting`);
      abort.abort();
    }
  }, 5_000);

  try {
    console.log(
      `[agent runtime] starting run with model=${config.defaultModel}, items=${input.length}, est=${estimatedTokens}t`,
    );
    const stream = await run(agent, input, {
      stream: true,
      signal: abort.signal,
      maxTurns: AGENT_MAX_TURNS,
    });

    for await (const event of stream) {
      lastEventAt = Date.now();
      if (event.type === 'raw_model_stream_event') {
        const data = event.data as unknown as { type?: string; delta?: string; text?: string };
        if (data?.type && /text.*delta/i.test(data.type) && typeof data.delta === 'string') {
          assistantText += data.delta;
          send({ type: 'text-delta', delta: data.delta });
        }
      } else if (event.type === 'run_item_stream_event') {
        const item = event.item as unknown as { type?: string; rawItem?: Record<string, unknown>; output?: unknown };
        if (event.name === 'tool_called' && item.type === 'tool_call_item') {
          const raw = item.rawItem ?? {};
          const toolCallId = String(raw.callId ?? raw.id ?? cryptoRandomShort());
          const toolName = String(raw.name ?? 'tool');
          let argsJson = '{}';
          try {
            argsJson = typeof raw.arguments === 'string' ? raw.arguments : JSON.stringify(raw.arguments ?? {});
          } catch {
            /* keep default */
          }
          let parsedInput: unknown;
          try {
            parsedInput = JSON.parse(argsJson);
          } catch {
            parsedInput = argsJson;
          }
          assistantToolCalls.push({ id: toolCallId, name: toolName, input: parsedInput });
          send({ type: 'tool-called', toolCallId, toolName, argsJson });
        } else if (event.name === 'tool_output' && item.type === 'tool_call_output_item') {
          const raw = item.rawItem ?? {};
          const toolCallId = String(raw.callId ?? raw.id ?? '');
          const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output ?? '');
          const tc = assistantToolCalls.find((c) => c.id === toolCallId);
          if (tc) tc.output = output.slice(0, 2048);
          send({ type: 'tool-output', toolCallId, output: output.slice(0, 2048) });
        } else if (event.name === 'message_output_created' && item.type === 'message_output_item') {
          const raw = item.rawItem ?? {};
          const content = raw.content as Array<{ type?: string; text?: string }> | undefined;
          const text = Array.isArray(content)
            ? content
                .filter((c) => c?.type === 'output_text' || c?.type === 'text')
                .map((c) => c?.text ?? '')
                .join('')
            : '';
          if (text) send({ type: 'message-completed', text });
        }
      }
    }

    await stream.completed;
    await flushConversation();
    send({ type: 'finish', reason: 'completed' });
  } catch (error) {
    const aborted = abort.signal.aborted;
    // error / abort 路径也保存已累积的部分，否则用户体感"全丢了"
    try {
      await flushConversation();
    } catch {
      /* 存盘失败不再二次报错 */
    }
    if (aborted && !timedOut) {
      send({ type: 'finish', reason: 'aborted' });
    } else if (timedOut) {
      send({
        type: 'error',
        message: `模型 ${config.defaultModel} 超过 ${STREAM_IDLE_TIMEOUT_MS / 1000}s 无响应，已中断。可能 endpoint 卡住或不支持本轮输入。看 electron-vite 终端日志查具体原因。`,
      });
      send({ type: 'finish', reason: 'error' });
    } else {
      // OpenAI SDK 经常把 fetch 失败包成 "Connection error."，真实原因藏在 .cause
      // 把 cause 链全打到主进程 console + 一并传给 renderer，方便定位
      const cause = (error as { cause?: unknown })?.cause;
      const causeMsg =
        cause instanceof Error ? `${cause.name}: ${cause.message}` : cause !== undefined ? String(cause) : '';
      console.error('[agent runtime] error:', error);
      if (cause !== undefined) console.error('[agent runtime] error.cause:', cause);
      const baseMsg = error instanceof Error ? error.message : String(error);
      const rawMsg = causeMsg ? `${baseMsg} (cause: ${causeMsg})` : baseMsg;
      const msg = isContextLengthError(rawMsg)
        ? '本次对话历史超出模型上下文长度。已尝试自动裁剪，仍超出的话请新开一个对话。'
        : isMaxTurnsError(rawMsg)
          ? `本次任务的 agent 工具调用超过 ${AGENT_MAX_TURNS} 轮，已自动停止。建议把任务拆小一点，或检查是否有某个工具在反复失败重试。`
        : isReasoningContentError(error, rawMsg)
          ? `当前模型「${config.defaultModel}」是带 thinking mode 的推理模型，多轮工具调用时要求回传 reasoning_content 字段，与 OpenAI Agents SDK 不兼容。请到设置切换到 GPT 系列（gpt-5.4）。`
          : rawMsg;
      send({ type: 'error', message: msg });
      send({ type: 'finish', reason: 'error' });
    }
  } finally {
    clearInterval(watchdog);
    activeRuns.delete(channelId);
    setReasoningDeltaListener(null);
  }

  /** 把本轮 user msg + 累积的 assistant msg 追加到 conversation 文件。 */
  async function flushConversation(): Promise<void> {
    if (!lastUser) return;
    const conv = await getConversation(profileId, convId);
    if (!conv) return;
    // 防重复 push：极端 race 下可能 user msg 已经在里面
    const lastConv = conv.messages[conv.messages.length - 1];
    if (lastConv?.id !== lastUser.id) {
      conv.messages.push(lastUser);
    }
    const assistantMsg: ChatMessage = {
      id: randomUUID(),
      role: 'assistant',
      content: assistantText,
      createdAt: Date.now(),
    };
    if (assistantToolCalls.length > 0) assistantMsg.toolCalls = assistantToolCalls;
    if (collectedArtifacts.length > 0) assistantMsg.artifacts = collectedArtifacts;
    conv.messages.push(assistantMsg);
    await saveConversation(conv);
  }
}

export function abortRun(channelId: string): void {
  const ctrl = activeRuns.get(channelId);
  if (ctrl) ctrl.abort();
}
