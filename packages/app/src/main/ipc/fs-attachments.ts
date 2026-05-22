import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import { BrowserWindow, Menu, ipcMain, shell } from 'electron';

import type { AttachmentSaveResult, AttachmentUploadInput } from '../../shared/types.ts';
import { saveAttachmentWithRemote } from '../attachment-remote.ts';
import { type WriteResult, writeFileToWorkspace } from '../fs-edit.ts';
import { getConfig } from '../store.ts';

/**
 * 路径白名单：先 `path.resolve` 折叠 `..`，再做 `startsWith(dir + sep)` 比较。
 * 比裸 `startsWith` 严：(a) 防 `..` 越界；(b) 避免 `/x/y` 误判 `/x/y2` 同根。
 */
export function inWorkspace(workspaceDir: string, abs: string): boolean {
  const root = workspaceDir.endsWith(sep) ? workspaceDir : workspaceDir + sep;
  return abs === workspaceDir || abs.startsWith(root);
}

// 二进制文件 → data URL，给 renderer 在 attachment-preview-dialog 里 <img> 直接显示。
// 走 IPC 而不是再注册一个 muicv-asset:// 协议：调用频次低 + 一份 data URL 用完就完，
// 不用考虑流式 / cache-control。同样限定在 workspaceDir 内。
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/** 右栏文件预览 + 编辑器 + 聊天框附件相关 IPC。 */
export function registerFsAttachmentsIpc(): void {
  ipcMain.handle('fs:read', async (_e, path: string): Promise<string | null> => {
    if (typeof path !== 'string' || !path) return null;
    const cfg = getConfig();
    if (!cfg.workspaceDir) return null;
    const abs = resolve(path);
    if (!inWorkspace(cfg.workspaceDir, abs)) return null;
    try {
      return await readFile(abs, 'utf8');
    } catch {
      return null;
    }
  });

  ipcMain.handle(
    'fs:listDir',
    async (_e, path: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }> | null> => {
      if (typeof path !== 'string' || !path) return null;
      const cfg = getConfig();
      if (!cfg.workspaceDir) return null;
      const abs = resolve(path);
      if (!inWorkspace(cfg.workspaceDir, abs)) return null;
      try {
        const entries = await readdir(abs, { withFileTypes: true });
        return entries
          .filter((e) => !e.name.startsWith('.') || e.name === '.claude')
          .map((e) => ({
            name: e.name,
            path: join(abs, e.name),
            isDirectory: e.isDirectory(),
          }))
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name, 'zh');
          });
      } catch {
        return null;
      }
    },
  );

  ipcMain.handle('fs:showInFolder', async (_e, path: string) => {
    if (typeof path !== 'string') return;
    const cfg = getConfig();
    if (!cfg.workspaceDir) return;
    const abs = resolve(path);
    if (!inWorkspace(cfg.workspaceDir, abs)) return;
    shell.showItemInFolder(abs);
  });

  // 右键菜单。renderer onContextMenu 拦下原生菜单，走这条路弹一个 role-based 的
  // 原生编辑菜单——所有 role 自动跟焦点状态联动（没选区时 copy/cut 自动 disabled），
  // 不用 renderer 维护可点性。
  //
  // editable=true：textarea 等可编辑控件，给完整编辑组（剪/复/粘/删/撤销/重做/全选）
  // editable=false：消息气泡等只读区域，只给"复制 / 全选"两项
  //
  // 仅在 chat textarea + 消息气泡区域接此 IPC，其它任何位置维持默认（空菜单 / 不弹）。
  ipcMain.on('chatInput:showContextMenu', (event, opts: { editable?: boolean } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    const editable = opts.editable !== false;
    const template: Electron.MenuItemConstructorOptions[] = editable
      ? [
          { role: 'undo', label: '撤销' },
          { role: 'redo', label: '重做' },
          { type: 'separator' },
          { role: 'cut', label: '剪切' },
          { role: 'copy', label: '复制' },
          { role: 'paste', label: '粘贴' },
          { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
          { role: 'delete', label: '删除' },
          { type: 'separator' },
          { role: 'selectAll', label: '全选' },
        ]
      : [
          { role: 'copy', label: '复制' },
          { role: 'selectAll', label: '全选' },
        ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: win });
  });

  ipcMain.handle('fs:readAsDataUrl', async (_e, path: string): Promise<string | null> => {
    if (typeof path !== 'string' || !path) return null;
    const cfg = getConfig();
    if (!cfg.workspaceDir) return null;
    const abs = resolve(path);
    if (!inWorkspace(cfg.workspaceDir, abs)) return null;
    const ext = abs.split('.').pop()?.toLowerCase() ?? '';
    const mime = MIME_BY_EXT[ext];
    if (!mime) return null; // 只允许图像类，避免 renderer 拿到任意二进制文件
    try {
      const buf = await readFile(abs);
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('fs:write', async (_e, path: string, content: string): Promise<WriteResult> => {
    const cfg = getConfig();
    return writeFileToWorkspace(cfg.workspaceDir, path, content);
  });

  ipcMain.handle(
    'attachments:save',
    async (_e, profileId: string, file: AttachmentUploadInput): Promise<AttachmentSaveResult> => {
      const cfg = getConfig();
      // profile 必须跟激活态对得上：renderer 切 profile 时未及时清空附件 → 这里挡住
      if (!profileId || profileId !== cfg.activeProfileId) {
        return { ok: false, reason: 'profile-mismatch', message: '请先选中职业档案' };
      }
      return saveAttachmentWithRemote(cfg, file);
    },
  );
}
