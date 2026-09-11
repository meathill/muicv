import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isTemplateId } from '@muicv/shared';
import { type BrowserWindow, dialog, ipcMain, shell } from 'electron';

import type { AppConfig, Profile } from '../../shared/types.ts';
import {
  addProfile,
  getConfig,
  listProfiles,
  patchConfig,
  removeProfile,
  renameProfile,
  setActiveProfile,
  setProfileDefaultTemplate,
} from '../store.ts';

/** 防重名：如果某 dir 已经被某个 profile 占了，直接复用它而不是再加一份。 */
function findByDir(dir: string): Profile | null {
  return listProfiles().find((p) => p.dir === dir) ?? null;
}

/** 在 ~/Documents/Mui简历/<safeName>/ 下创建一个目录，确保唯一。 */
async function ensureUniqueDocumentsDir(name: string): Promise<string> {
  const safe = name.replace(/[\\/:*?"<>|]/g, '_').trim() || '简历';
  const root = join(homedir(), 'Documents', 'Mui简历');
  let candidate = join(root, safe);
  let i = 2;
  while (findByDir(candidate)) {
    candidate = join(root, `${safe} (${i})`);
    i++;
  }
  await mkdir(candidate, { recursive: true });
  return candidate;
}

/**
 * config + profile IPC：getConfig / patchConfig / profile CRUD / profile:ensureDefault
 * 等。需要 `getMainWindow` 拿 BrowserWindow 给 dialog.showOpenDialog 当 parent。
 */
export function registerConfigProfileIpc(deps: { getMainWindow: () => BrowserWindow | null }): void {
  // -------- config --------
  ipcMain.handle('config:get', (): AppConfig => getConfig());
  ipcMain.handle('config:set', (_event, patch: Parameters<typeof patchConfig>[0]): AppConfig => patchConfig(patch));

  // -------- profile --------
  ipcMain.handle('profile:create', async (_e, opts: { name: string; dir?: string }) => {
    if (!opts?.name?.trim()) return { ok: false, message: '名字不能为空' };
    let dir = opts.dir;
    if (!dir) {
      const win = deps.getMainWindow();
      if (!win) return { ok: false, message: '窗口未就绪' };
      const r = await dialog.showOpenDialog(win, {
        title: `选一个目录给"${opts.name}"`,
        properties: ['openDirectory', 'createDirectory'],
      });
      if (r.canceled || r.filePaths.length === 0) return { ok: false };
      dir = r.filePaths[0]!;
    }
    const existing = findByDir(dir);
    if (existing) {
      setActiveProfile(existing.id);
      return { ok: true, profile: existing };
    }
    const profile = addProfile(opts.name, dir);
    return { ok: true, profile };
  });

  ipcMain.handle('profile:createInDocuments', async (_e, name: string) => {
    if (!name?.trim()) return { ok: false, message: '名字不能为空' };
    try {
      const dir = await ensureUniqueDocumentsDir(name);
      const profile = addProfile(name, dir);
      return { ok: true, profile };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : '创建目录失败' };
    }
  });

  ipcMain.handle('profile:pickFolder', async (_e, name: string) => {
    const win = deps.getMainWindow();
    if (!win) return { ok: false, message: '窗口未就绪' };
    const r = await dialog.showOpenDialog(win, {
      title: `选一个目录给"${name || '新档案'}"`,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (r.canceled || r.filePaths.length === 0) return { ok: false };
    const dir = r.filePaths[0]!;
    const existing = findByDir(dir);
    if (existing) {
      setActiveProfile(existing.id);
      return { ok: true, profile: existing };
    }
    const profile = addProfile(name?.trim() || '新档案', dir);
    return { ok: true, profile };
  });

  ipcMain.handle('profile:switchTo', (_e, id: string) => setActiveProfile(id));
  ipcMain.handle('profile:rename', (_e, id: string, name: string) => renameProfile(id, name));
  ipcMain.handle('profile:remove', (_e, id: string) => removeProfile(id));

  ipcMain.handle('profile:openInFinder', async (_e, id: string) => {
    const p = listProfiles().find((x) => x.id === id);
    if (p) await shell.openPath(p.dir);
  });

  /**
   * 设置 profile 的默认简历模板。template === null 清除；否则必须是合法模板 id
   * （'default' / 't1-classic' / ... / 't6-academic'）。renderer 端调用前后端都做一遍
   * 校验，避免 IPC 注入。
   */
  ipcMain.handle('profile:setDefaultTemplate', (_e, id: string, template: string | null) => {
    if (template !== null && !isTemplateId(template)) {
      return getConfig();
    }
    return setProfileDefaultTemplate(id, template);
  });

  // renderer 在 bootstrap + onAutoLogin 都会调 ensureDefault，二者可能并发；
  // 用 in-flight promise 序列化，避免并发竞争产生重复 profile。
  let ensureDefaultInFlight: Promise<AppConfig> | null = null;
  ipcMain.handle('profile:ensureDefault', () => {
    if (ensureDefaultInFlight) return ensureDefaultInFlight;
    ensureDefaultInFlight = (async () => {
      try {
        if (listProfiles().length > 0) return getConfig();
        const dir = await ensureUniqueDocumentsDir('默认');
        addProfile('默认', dir);
      } catch (err) {
        console.error('[profile:ensureDefault] failed', err);
      }
      return getConfig();
    })().finally(() => {
      ensureDefaultInFlight = null;
    });
    return ensureDefaultInFlight;
  });
}
