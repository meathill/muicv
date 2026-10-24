/**
 * Cloud STT 重试 / 超时 / 退避（issue #6）。
 *
 * 拆出来独立成文件而不是放 audio.ts，是因为 audio.ts 依赖了
 * whisper-engine/transcribe.ts，后者用了 TS parameter property 语法，
 * 在 `node --test` strip-only TS 模式下解析失败——直接 import audio.ts 跑单测会炸。
 * 这里只放纯逻辑（fetch + 退避），不依赖 electron / whisper-engine，单测直接 import 即可。
 */

import { Buffer } from 'node:buffer';

import type { AppConfig, AudioRecordingPayload } from '../shared/types.ts';

type CloudTranscribeBody = {
  transcript: string;
  duration_ms?: number;
  language?: string;
};

/**
 * Cloud 转写 + 自动重试。
 *
 * - 最多 maxAttempts 次（默认 3）。
 * - 每次 attempt 用 AbortController 套 perAttemptTimeoutMs（默认 60s）。
 * - 重试条件：网络错（fetch throws） / 5xx / 429。
 * - 不重试：4xx 非 429（401 鉴权 / 400 格式 / 413 文件过大）—— 立即抛，不浪费配额、不掩盖配置错。
 * - 退避：500ms → 1000ms（指数）。429 优先尊重 Retry-After header（秒数或 HTTP-date）。
 */
export async function postTranscribeWithRetry(
  config: AppConfig,
  payload: AudioRecordingPayload,
  opts: { maxAttempts?: number; perAttemptTimeoutMs?: number } = {},
): Promise<CloudTranscribeBody> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const timeoutMs = opts.perAttemptTimeoutMs ?? 60_000;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let waitMs: number | null = null;
    let fatal: Error | null = null;
    try {
      const res = await postTranscribe(config, payload, ctrl.signal);
      if (res.ok) {
        const body = (await res.json().catch(() => null)) as CloudTranscribeBody | null;
        if (body && typeof body.transcript === 'string') return body;
        // 200 但格式不对：视为可重试的服务端故障
        lastErr = new Error('muicv /audio/transcribe 响应不含 transcript');
      } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // 4xx（429 除外）：鉴权 / 配置 / 文件格式错误，重试无意义，立即终止。
        const text = await res.text().catch(() => '');
        fatal = new Error(`muicv /audio/transcribe 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`);
      } else {
        lastErr = new Error(`muicv /audio/transcribe 返回 ${res.status}`);
        if (res.status === 429) {
          const ra = parseRetryAfter(res.headers.get('retry-after'));
          if (ra != null) waitMs = Math.min(ra, 30_000);
        }
      }
    } catch (e) {
      // fetch throw（网络断 / DNS / TLS）/ AbortError（60s 超时）：可重试
      lastErr = e instanceof Error ? e : new Error(String(e));
    } finally {
      clearTimeout(timer);
    }
    if (fatal) throw fatal;
    if (attempt < maxAttempts) {
      await sleep(waitMs ?? 500 * 2 ** (attempt - 1));
    }
  }
  throw lastErr ?? new Error('muicv /audio/transcribe 重试 3 次仍失败');
}

export async function postTranscribe(
  config: AppConfig,
  payload: AudioRecordingPayload,
  signal?: AbortSignal,
): Promise<Response> {
  const audio = Buffer.from(payload.audioBase64, 'base64');
  const blob = new Blob([audio], { type: payload.mimeType });
  const form = new FormData();
  form.append('file', blob, fileNameForMime(payload.mimeType));
  const headers: Record<string, string> = config.muicvApiKey ? { authorization: `Bearer ${config.muicvApiKey}` } : {};
  const init: RequestInit = { method: 'POST', headers, body: form };
  if (signal) init.signal = signal;
  return await fetch(`${config.muicvApiBase.replace(/\/$/, '')}/audio/transcribe`, init);
}

export function fileNameForMime(mime: string): string {
  if (mime.includes('webm')) return 'recording.webm';
  if (mime.includes('ogg')) return 'recording.ogg';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'recording.m4a';
  if (mime.includes('wav')) return 'recording.wav';
  return 'recording.bin';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry-After header：秒数（"15"） / HTTP-date（"Wed, 21 Oct 2026 07:28:00 GMT"）都接。返回毫秒。 */
export function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(trimmed);
  if (Number.isFinite(date)) {
    return Math.max(date - Date.now(), 0);
  }
  return null;
}
