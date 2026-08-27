import { ipcMain } from 'electron';

import { TTS_MAX_TEXT_CHARS } from '@muicv/shared';

import type { TtsSpeakOutcome } from '../../shared/types.ts';
import { getConfig } from '../store.ts';

/**
 * TTS 朗读 IPC：renderer 的消息操作条「朗读」按钮 → muicv API POST /audio/tts。
 *
 * 走 main 而不是 renderer 直接 fetch：mui_ key 只存在 main 进程（safeStorage 加密），
 * 且语音播放本地化后 renderer 拿到的就是一份 wav base64，不用关心鉴权细节。
 */
export function registerSpeechIpc(): void {
  ipcMain.handle('speech:tts', async (_e, rawText: string): Promise<TtsSpeakOutcome> => {
    const cfg = getConfig();
    if (!cfg.muicvApiKey) {
      return { ok: false, message: '还没登录 muicv 账号，登录后才能朗读' };
    }
    const text = (typeof rawText === 'string' ? rawText : '').trim().slice(0, TTS_MAX_TEXT_CHARS);
    if (!text) {
      return { ok: false, message: '这条消息没有可朗读的文字' };
    }

    try {
      const res = await fetch(`${cfg.muicvApiBase.replace(/\/$/, '')}/audio/tts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.muicvApiKey}` },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        // 尽量把服务端给的可读信息翻出来（402 余额不足 / 参数错等）
        let detail = `HTTP ${res.status}`;
        try {
          const bodyText = await res.text();
          try {
            const json = JSON.parse(bodyText) as { error?: unknown; message?: unknown };
            if (typeof json.message === 'string') detail = json.message;
            else if (typeof json.error === 'string') detail = json.error;
            else detail = `${detail} ${bodyText.slice(0, 120)}`;
          } catch {
            if (bodyText) detail = `${detail} ${bodyText.slice(0, 120)}`;
          }
        } catch {
          /* 读不到 body 就维持状态码 */
        }
        return { ok: false, message: detail };
      }
      const wav = Buffer.from(await res.arrayBuffer());
      if (wav.byteLength === 0) {
        return { ok: false, message: '服务端返回了空音频' };
      }
      return { ok: true, audioBase64: wav.toString('base64') };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? `网络错误：${err.message}` : '网络错误',
      };
    }
  });
}
