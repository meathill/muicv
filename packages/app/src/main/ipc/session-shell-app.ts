import { app, ipcMain, shell } from 'electron';

import { fetchSkillsCatalog } from '../content-catalog.ts';
import { beginConnect, beginLinkMuirouter } from '../deep-link.ts';
import { loginWithKey, checkSession as runCheckSession, logout as runLogout, verifyCandidateKey } from '../session.ts';
import { getConfig } from '../store.ts';

/** session / shell / app 元信息 IPC：登录态、外链、版本号。 */
export function registerSessionShellAppIpc(): void {
  ipcMain.handle('session:check', () => runCheckSession());
  ipcMain.handle('session:verify', (_e, candidate: string) => verifyCandidateKey(candidate));
  ipcMain.handle('session:login', (_e, candidate: string) => loginWithKey(candidate));
  ipcMain.handle('session:logout', () => {
    runLogout();
  });
  ipcMain.handle('session:beginConnect', () => beginConnect());
  ipcMain.handle('session:beginLinkMuirouter', () => beginLinkMuirouter());

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('shell:openWorkspace', async () => {
    const cfg = getConfig();
    if (cfg.workspaceDir) await shell.openPath(cfg.workspaceDir);
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('skills:catalog', () => fetchSkillsCatalog());
}
