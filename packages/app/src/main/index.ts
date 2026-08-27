import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BrowserWindow, app, protocol } from 'electron';

import { handleDeepLink, registerScheme, setMainWindowGetter } from './deep-link.ts';
import { registerAgentConversationIpc } from './ipc/agent-conversation.ts';
import { registerAudioPreviewIpc } from './ipc/audio-preview.ts';
import { registerSpeechIpc } from './ipc/speech.ts';
import { registerConfigProfileIpc } from './ipc/config-profile.ts';
import { inWorkspace, registerFsAttachmentsIpc } from './ipc/fs-attachments.ts';
import { registerSessionShellAppIpc } from './ipc/session-shell-app.ts';
import { dedupeProfiles, getConfig } from './store.ts';
import { setupUpdater, triggerInitialCheck } from './updater.ts';
import { registerWhisperEngineIpc } from './whisper-engine/index.ts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

// dev: BrowserWindow icon 在 macOS 被忽略，下面 whenReady 还会调 dock.setIcon。
// prod: macOS 走 .app bundle 的 icns，无需在这里设置。
const devIconPath = join(__dirname, '../../build/icon.png');

// -------------------- Single instance（Windows/Linux deep-link 必需） --------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find((a) => typeof a === 'string' && a.startsWith('muicv://'));
    if (link) void handleDeepLink(link);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  void handleDeepLink(url);
});

registerScheme();
setMainWindowGetter(() => mainWindow);

// muicv-pdf:// —— renderer 用 <iframe> 给本地 PDF 走 Chromium 内置 viewer 渲染。
// 必须在 app.ready 之前 registerSchemesAsPrivileged，handler 在 whenReady 里 register。
// stream: true 让大 PDF 可流式返回；standard: true 让 URL parser 走标准 host/path 解析。
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'muicv-pdf',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: false,
    },
  },
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#fdfaf2',
    ...(isDev ? { icon: devIconPath } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      // Chromium 内置 PDF viewer 是个 plugin，Electron 默认 plugins=false 时
      // <iframe src="muicv-pdf://..."> 会静默白屏（response 200、内容也对，但
      // viewer 不接管）。开 plugins:true 让 PDF 直接在 iframe 渲染。
      plugins: true,
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// -------------------- IPC 模块化注册 --------------------

registerConfigProfileIpc({ getMainWindow: () => mainWindow });
registerSessionShellAppIpc();
registerAgentConversationIpc();
registerFsAttachmentsIpc();
registerAudioPreviewIpc();
registerSpeechIpc();

// 本地 whisper.cpp 引擎插件（issue #1 M3）。进度事件用 mainWindow.webContents 推送。
registerWhisperEngineIpc(() => mainWindow?.webContents ?? null);

/**
 * muicv-pdf:// 协议的白名单 + MIME 映射。
 * 只允许 chromium 内置 viewer 能 inline 渲染的本地受信任文件（PDF 走 PDF viewer、
 * 图片走 image viewer / <img>）。其他类型一律 400。
 */
function mimeForLocalAsset(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  // 音频附件预览：renderer 用 <audio controls src="muicv-pdf://local/..."> 回放。
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return null;
}

// -------------------- App lifecycle --------------------

app.whenReady().then(() => {
  // 历史脏数据清理：早期版本因并发 ensureDefault 可能产生重复 profile，
  // 启动时按 dir 合并一次。
  dedupeProfiles();

  // muicv-pdf://local/<absolute-path> → 本地"让 Chromium 内置 viewer 直接 stream"的文件。
  // 历史命名带 pdf，现在泛化为服务 PDF + 常见图片格式（renderer 用 <iframe> / <img> 渲染）。
  // 安全：必须在当前激活 profile 的 workspaceDir 之内，且后缀在白名单。
  protocol.handle('muicv-pdf', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'local') {
      return new Response('Bad host', { status: 400 });
    }
    let raw = decodeURIComponent(url.pathname);
    // Windows: '/C:/Users/...' → 'C:/Users/...'，让 path.resolve 正确识别盘符。
    // 渲染端编码细节见 src/renderer/lib/muicv-pdf-url.ts。
    if (/^\/[A-Za-z]:/.test(raw)) raw = raw.slice(1);
    const filePath = resolve(raw);
    const cfg = getConfig();
    if (!cfg.workspaceDir || !inWorkspace(cfg.workspaceDir, filePath)) {
      return new Response('Forbidden: out of workspace', { status: 403 });
    }
    const contentType = mimeForLocalAsset(filePath);
    if (!contentType) {
      return new Response('Unsupported file type', { status: 400 });
    }
    try {
      const [buf, meta] = await Promise.all([readFile(filePath), stat(filePath)]);
      // 转成普通 ArrayBuffer，避免 Buffer 在 Response 里被当 SharedArrayBuffer
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return new Response(ab, {
        status: 200,
        headers: {
          'content-type': contentType,
          'content-length': String(meta.size),
          'cache-control': 'no-store',
        },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });

  if (isDev && process.platform === 'darwin') {
    app.dock?.setIcon(devIconPath);
  }

  createWindow();

  // 自动更新：注册 IPC + 事件监听；延迟 10s 触发首次检查，让登录 / OAuth /
  // workspace 加载先跑完。dev 模式下 setupUpdater 内部直接 short-circuit。
  setupUpdater(() => mainWindow);
  setTimeout(triggerInitialCheck, 10_000);

  const cold = process.argv.find((a) => typeof a === 'string' && a.startsWith('muicv://'));
  if (cold) {
    mainWindow?.webContents.once('did-finish-load', () => {
      void handleDeepLink(cold);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
