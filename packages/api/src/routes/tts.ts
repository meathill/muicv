import { displayToMicro, insufficientBalanceError, TTS_MAX_TEXT_CHARS, TTS_RATE_PER_CHAR } from '@muicv/shared';
import type { Context } from 'hono';

import { type SynthesizeOptions, synthesizeSpeech, TtsError } from '../lib/tts.ts';
import { charge, ensureBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * 音色 id 放开到「保守字符集」而不是硬白名单：预置音色官方列表会扩
 * （中文冰糖/茉莉/苏打的确切 API 拼写没在文档代码块里锚定），whitelist 拍脑袋容易误杀；
 * 这里只挡结构性非法输入，具体值由上游自己报错。
 */
const VOICE_PATTERN = /^[A-Za-z0-9_\u4e00-\u9fff-]{1,64}$/;

/** 计费金额（μtoken）= 字符数 × TTS_RATE_PER_CHAR。rate 是整数显示 token，乘完再进位 μ。 */
function computeTtsCharge(chars: number): number {
  return displayToMicro(chars * TTS_RATE_PER_CHAR);
}

/**
 * POST /audio/tts —— 文本转语音（朗读简历点评 / 面试回答等场景）。
 *
 * Request:
 *   - Content-Type: application/json
 *   - Authorization: Bearer mui_xxx
 *   - Body: { text: string, voice?: string, style?: string }
 *     - text ≤ 2000 code points
 *     - voice 预置音色 id，默认 mimo_default
 *     - style 自然语言风格指令（语速/情绪/方言），≤200 字符
 *
 * Response:
 *   200 audio/wav 二进制（客户端拿到即播）
 *   400 参数错误（非 JSON / text 空·超长 / voice 形状非法）
 *   402 余额不足
 *   502 上游失败（不扣账）
 *
 * 上游是 Xiaomi MiMo-V2.5-TTS（限时免费）；计费按成功后字符数 × TTS_RATE_PER_CHAR，
 * 与 transcribe 一致走 waitUntil 异步扣账。
 */
export async function handleTts(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const ct = c.req.header('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return c.json({ error: 'Content-Type 必须是 application/json' }, 400);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await c.req.json();
  } catch {
    return c.json({ error: '请求体不是合法 JSON' }, 400);
  }

  if (typeof parsedBody !== 'object' || parsedBody === null) {
    return c.json({ error: '请求体必须是 JSON 对象' }, 400);
  }
  const body = parsedBody as { text?: unknown; voice?: unknown; style?: unknown };

  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    return c.json({ error: '缺少 `text`（待合成的非空文本）' }, 400);
  }
  // 语义按 code point 数（中文一字算一字符）；超出上限直接拒，不做静默截断
  if (body.text.length > TTS_MAX_TEXT_CHARS) {
    return c.json({ error: `text 超过 ${TTS_MAX_TEXT_CHARS} 字符，请分段` }, 400);
  }
  if (body.voice !== undefined && (typeof body.voice !== 'string' || !VOICE_PATTERN.test(body.voice))) {
    return c.json({ error: 'voice 必须是合法音色 id（字母数字下划线中文连字符，≤64 位）' }, 400);
  }
  if (body.style !== undefined && (typeof body.style !== 'string' || body.style.length > 200)) {
    return c.json({ error: 'style 最长 200 字符' }, 400);
  }

  const minChargeMicro = displayToMicro(TTS_RATE_PER_CHAR);
  const wallet = await ensureBalance(c.env, userId);
  if (wallet.balance < minChargeMicro) {
    return c.json(insufficientBalanceError(wallet.balance), 402);
  }

  // exactOptionalPropertyTypes：可选项只在有值时挂进 opts，不能显式塞 undefined
  const synthOpts: SynthesizeOptions = { text: body.text };
  if (typeof body.voice === 'string') synthOpts.voice = body.voice;
  if (typeof body.style === 'string') synthOpts.style = body.style;

  let result: Awaited<ReturnType<typeof synthesizeSpeech>>;
  try {
    result = await synthesizeSpeech(synthOpts, c.env);
  } catch (err) {
    if (err instanceof TtsError) {
      const status = err.detail.error === 'tts-key-missing' ? 500 : err.status;
      return c.json(err.detail, status);
    }
    return c.json({ error: '语音合成失败', detail: err instanceof Error ? err.message : String(err) }, 502);
  }

  // waitUntil 在测试 ctx 里同步执行（见各 test 的 ctx 实现）
  c.executionCtx.waitUntil(
    charge(c.env, userId, computeTtsCharge(body.text.length), 'tts', {
      chars: body.text.length,
      voice: body.voice ?? undefined,
    }).catch(() => {}),
  );

  return new Response(result.audio, {
    status: 200,
    headers: { 'content-type': 'audio/wav' },
  });
}
