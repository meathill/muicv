import { Buffer } from 'node:buffer';

/**
 * TTS 语音合成：Xiaomi MiMo-V2.5-TTS（限时免费，模型当前不限流量的窗口期要抓住）。
 *
 * 上游不是传统 /audio/speech 端点，而是 OpenAI 兼容的 chat/completions：
 *   - 待合成文本放 **assistant** 角色消息（官方约定，放 user 会不合成）
 *   - 风格指令（语速 / 情绪 / 方言等自然语言）可选放 user 角色
 *   - `audio: { format: 'wav', voice }` 指定音色与格式
 *   - 非流式响应里音频 base64 在 `choices[0].message.audio.data`
 *
 * 文档：https://mimo.mi.com/docs/zh-CN/quick-start/usage-guide/audio/speech-synthesis-v2.5
 */

const MIMO_TTS_BASE = 'https://api.xiaomimimo.com/v1';

export const TTS_MODEL = 'mimo-v2.5-tts' as const;

/** 默认预置音色；客户端可换（冰糖 / 茉莉 / 苏打 / Mia / Chloe / Milo / Dean 等）。 */
export const DEFAULT_TTS_VOICE = 'mimo_default';

export type TtsEnv = {
  MIMO_API_KEY?: string;
};

export type TtsResult = {
  /** 解码后的完整 WAV 字节 */
  audio: Uint8Array;
};

/**
 * 上游调用失败（网络 / HTTP 错误 / 响应形状不对）。caller 统一映射 502 透传，不扣账。
 */
export class TtsError extends Error {
  readonly status = 502 as const;
  readonly detail: { error: string; [k: string]: unknown };
  constructor(detail: { error: string; [k: string]: unknown }) {
    super(detail.error);
    this.detail = detail;
  }
}

export type SynthesizeOptions = {
  text: string;
  /** 预置音色 id 或克隆音 data URI；缺省 mimo_default */
  voice?: string;
  /** 自然语言风格指令（"语速稍快、亲切" 等），给 user 角色 */
  style?: string;
};

/** 合成语音。文本为空 / 缺 key 由 caller 先拦；这里只对上游交互负责。 */
export async function synthesizeSpeech(opts: SynthesizeOptions, env: TtsEnv): Promise<TtsResult> {
  if (!env.MIMO_API_KEY) {
    throw new TtsError({
      error: 'tts-key-missing',
      message: '后端没配 MIMO_API_KEY（部署人员需要 wrangler secret put）',
    });
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (opts.style) {
    messages.push({ role: 'user', content: opts.style });
  }
  messages.push({ role: 'assistant', content: opts.text });

  let res: Response;
  try {
    res = await fetch(`${MIMO_TTS_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        messages,
        audio: { format: 'wav', voice: opts.voice || DEFAULT_TTS_VOICE },
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new TtsError({
      error: 'tts-upstream-network-error',
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new TtsError({ error: 'tts-upstream-error', status: res.status, body: raw.slice(0, 500) });
  }

  let audioBase64: string | undefined;
  try {
    const json = JSON.parse(raw) as { choices?: Array<{ message?: { audio?: { data?: string } } }> };
    audioBase64 = json.choices?.[0]?.message?.audio?.data;
  } catch {
    throw new TtsError({ error: 'tts-upstream-invalid-json', body: raw.slice(0, 500) });
  }
  if (!audioBase64 || audioBase64.length === 0) {
    throw new TtsError({ error: 'tts-upstream-no-audio', body: raw.slice(0, 500) });
  }

  return { audio: new Uint8Array(Buffer.from(audioBase64, 'base64')) };
}
