import { ipcMain, type WebContents } from 'electron';

import {
  installEngine,
  installModel,
  type ProgressCallback,
  uninstallAll,
  uninstallEngine,
  uninstallModel,
} from './install.ts';
import {
  getDefaultModel,
  getPreference,
  getStatus,
  type ModelName,
  type SttPreference,
  setDefaultModel,
  setPreference,
  type WhisperPluginStatus,
} from './state.ts';
import { type LocalTranscribeResult, transcribeLocal } from './transcribe.ts';

/**
 * 本地 whisper.cpp 引擎插件入口（issue #1 M3）。
 *
 * 暴露：
 *   - getStatus() / setPreference / setDefaultModel
 *   - installEngine / installModel / uninstall*
 *   - transcribeLocal —— 给 audio.ts recordAndTranscribe 公共流程用
 *
 * IPC：
 *   - whisperEngine:status / setPreference / setDefaultModel
 *   - whisperEngine:installEngine / installModel
 *   - whisperEngine:uninstallEngine / uninstallModel / uninstallAll
 *   - 进度走 webContents.send('whisperEngine:progress', { kind, target, event })
 */

export {
  getDefaultModel,
  getPreference,
  getStatus,
  type LocalTranscribeResult,
  type ModelName,
  type SttPreference,
  setDefaultModel,
  setPreference,
  transcribeLocal,
  type WhisperPluginStatus,
};

let registered = false;

export function registerWhisperEngineIpc(getMainSender: () => WebContents | null): void {
  if (registered) return;
  registered = true;

  const sendProgress = (kind: 'engine' | 'model', target: string) => {
    const sender = getMainSender();
    const cb: ProgressCallback = (event) => {
      if (sender && !sender.isDestroyed()) {
        sender.send('whisperEngine:progress', { kind, target, event });
      }
    };
    return cb;
  };

  ipcMain.handle('whisperEngine:status', () => getStatus());

  ipcMain.handle('whisperEngine:setPreference', (_e, pref: SttPreference) => {
    setPreference(pref);
    return getStatus();
  });

  ipcMain.handle('whisperEngine:setDefaultModel', (_e, name: ModelName) => {
    setDefaultModel(name);
    return getStatus();
  });

  ipcMain.handle(
    'whisperEngine:installEngine',
    async (
      _e,
      engineVersion: string,
    ): Promise<{ ok: true; status: WhisperPluginStatus } | { ok: false; message: string }> => {
      try {
        await installEngine({ engineVersion, onProgress: sendProgress('engine', engineVersion) });
        return { ok: true, status: await getStatus() };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle(
    'whisperEngine:installModel',
    async (
      _e,
      name: ModelName,
    ): Promise<{ ok: true; status: WhisperPluginStatus } | { ok: false; message: string }> => {
      try {
        await installModel({ name, onProgress: sendProgress('model', name) });
        return { ok: true, status: await getStatus() };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : String(err) };
      }
    },
  );

  ipcMain.handle('whisperEngine:uninstallEngine', async (): Promise<WhisperPluginStatus> => {
    await uninstallEngine();
    return await getStatus();
  });

  ipcMain.handle('whisperEngine:uninstallModel', async (_e, name: ModelName): Promise<WhisperPluginStatus> => {
    await uninstallModel(name);
    return await getStatus();
  });

  ipcMain.handle('whisperEngine:uninstallAll', async (): Promise<WhisperPluginStatus> => {
    await uninstallAll();
    return await getStatus();
  });
}
