import { type BrowserWindow, app, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';

import type { UpdaterStatus } from '../shared/types.ts';

const { autoUpdater } = electronUpdater;

/**
 * electron-updater 集成。
 *
 * 思路：把 electron-updater 暴露的 6 个事件（checking-for-update / update-available /
 * download-progress / update-not-available / update-downloaded / error）整合成一个
 * 单值状态（{@link UpdaterStatus}），通过 'updater:status' 推给 renderer。renderer
 * 拿到就能直接渲染卡片，不用自己拼状态机。
 *
 * 三个 IPC：getStatus / checkNow / quitAndInstall。dev mode（!app.isPackaged）整体
 * 跳过——electron-updater 在未打包时会报「找不到 dev-app-update.yml」，比起放配置
 * 启动后由 [index.ts](./index.ts) 在 app.whenReady 里延迟 10s 触发首次检查，
 * 并在打包环境下启动每 4 小时的后台定时轮询。
 */

/** 自动更新后台轮询间隔：4 小时检查一次。 */
export const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let currentStatus: UpdaterStatus = { phase: 'idle' };
let getMainWindowRef: (() => BrowserWindow | null) | null = null;
let periodicCheckTimer: NodeJS.Timeout | null = null;

function broadcast(next: UpdaterStatus): void {
  currentStatus = next;
  const win = getMainWindowRef?.();
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', next);
  }
}

function setupAutoUpdaterEvents(): void {
  // electron-updater 默认行为已经是 autoDownload=true / autoInstallOnAppQuit=true，
  // 显式写一遍方便后续读代码。
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    broadcast({ phase: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcast({ phase: 'downloading', version: info.version, percent: 0 });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcast({
      phase: 'downloading',
      ...(currentStatus.version ? { version: currentStatus.version } : {}),
      percent: progress.percent,
      transferredBytes: progress.transferred,
      totalBytes: progress.total,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    broadcast({
      phase: 'idle',
      latestVersion: info.version,
      lastCheckedAt: Date.now(),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ phase: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    broadcast({
      phase: 'error',
      message: err?.message ?? String(err),
    });
  });
}

/**
 * 注册 updater 模块。必须在 app.whenReady 后调用一次。
 *
 * @param getMainWindow 拿当前主窗口的取值器（renderer push 状态用）。
 *   传函数而不是 BrowserWindow 实例，是因为窗口可能被关闭重建。
 */
export function setupUpdater(getMainWindow: () => BrowserWindow | null): void {
  getMainWindowRef = getMainWindow;

  // dev mode：注册 IPC 但所有 invoke 直接返回 skipped 状态，避免 renderer
  // 因为没有 handler 而 invoke reject。autoUpdater 一概不挂事件、不调。
  if (!app.isPackaged) {
    currentStatus = { phase: 'idle', skipped: true };

    ipcMain.handle('updater:getStatus', () => currentStatus);
    ipcMain.handle('updater:checkNow', () => currentStatus);
    ipcMain.handle('updater:quitAndInstall', () => {
      // dev 下故意 no-op；不抛错，避免 renderer 处理。
    });
    return;
  }

  setupAutoUpdaterEvents();

  ipcMain.handle('updater:getStatus', () => currentStatus);

  ipcMain.handle('updater:checkNow', async (): Promise<UpdaterStatus> => {
    try {
      // checkForUpdates 触发的事件流（checking → available/not-available → ...）
      // 已经会同步推 broadcast，这里只是顺手把当前 snapshot 返回，
      // 让 renderer 立刻拿到 'checking' 状态而不必等下一次推送。
      await autoUpdater.checkForUpdates();
    } catch (err) {
      broadcast({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return currentStatus;
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    if (currentStatus.phase !== 'ready') return;
    // isSilent=false：让 NSIS / pkg installer 该弹界面就弹，避免静默卡住。
    // isForceRunAfter=true：安装完自动重启 app，符合「立即重启」按钮语义。
    autoUpdater.quitAndInstall(false, true);
  });

  // 应用退出前清理定时器
  app.on('before-quit', () => {
    stopPeriodicCheck();
  });
}

/** 停止后台定时检查轮询。 */
export function stopPeriodicCheck(): void {
  if (periodicCheckTimer) {
    clearInterval(periodicCheckTimer);
    periodicCheckTimer = null;
  }
}

/**
 * 由 index.ts 在 createWindow 后、延迟 10 秒触发首次自动检查，
 * 并在打包环境下启动每 4 小时的后台定时轮询。
 * 不抛错——错误会通过 'error' 事件流到 renderer。
 */
export function triggerInitialCheck(): void {
  if (!app.isPackaged) return;
  void autoUpdater.checkForUpdates().catch(() => {
    // 'error' 事件会触发 broadcast，这里不需要再处理
  });

  if (!periodicCheckTimer) {
    periodicCheckTimer = setInterval(() => {
      // 若当前正在下载或准备就绪，跳过轮询避免打断当前状态
      if (currentStatus.phase === 'downloading' || currentStatus.phase === 'ready') return;
      void autoUpdater.checkForUpdates().catch(() => {
        // 'error' 事件会触发 broadcast，这里不需要再处理
      });
    }, UPDATE_CHECK_INTERVAL_MS);
    periodicCheckTimer.unref();
  }
}
