import { randomBytes } from 'node:crypto';
import { isTemplateId } from '@muicv/shared';
import { app, type BrowserWindow, shell } from 'electron';

import type { MuirouterLinkResult, SessionCheckResult } from '../shared/types.ts';
import { loginWithKey } from './session.ts';
import { getActiveProfile, getConfig, setProfileDefaultTemplate } from './store.ts';

/**
 * OAuth-style 自动登录的 main-side 实现。
 *
 * 流程：
 *   1. renderer 调 session:beginConnect → generateState() + 把 state 记到 pendingStates
 *   2. shell.openExternal 打开 https://muicv.com/connect?state=...&redirect=muicv://callback
 *   3. 用户在网页授权 → 浏览器 navigate 到 muicv://callback?state=...&key=mui_xxx
 *   4. macOS 的 'open-url' 事件 / Windows / Linux 的 single-instance 第二次启动参数都
 *      汇聚到 handleDeepLink()
 *   5. 验 state、验 key（loginWithKey 内部会调 /me），都过则推 session:autoLogin 给 renderer
 *
 * State 仅在内存中维护，过期 5 分钟，单进程内使用 —— Electron 重启后所有 pending 失效，
 * 这就是我们想要的（重启后没有 state 还接受 callback 等于无防护，宁可重新发起）。
 */

const SCHEME = 'muicv';
const STATE_TTL_MS = 5 * 60 * 1000;
const CONNECT_PATH = '/connect';
const MUIROUTER_OAUTH_START_PATH = '/api/muirouter/oauth/start';

type Pending = { state: string; createdAt: number };
const pending = new Map<string, Pending>();
/** 独立的 muirouter OAuth pending map，跟登录用的 pending 隔离，避免互相串扰。 */
const pendingMuirouter = new Map<string, Pending>();

let mainWindowGetter: () => BrowserWindow | null = () => null;

/** 把 main 进程窗口的 getter 注入进来（启动顺序原因不能直接 import）。 */
export function setMainWindowGetter(getter: () => BrowserWindow | null): void {
  mainWindowGetter = getter;
}

/**
 * 注册 muicv:// scheme（必须在 app.ready 之前调；index.ts 已经早调了）。
 * dev 模式下 electron 进程是 ${exe} ${entry}，需要显式传 process.argv[1] 让
 * OS 知道点击 muicv:// 时该用什么命令唤醒。
 */
export function registerScheme(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(SCHEME, process.execPath, [process.argv[1] ?? '']);
    }
  } else {
    app.setAsDefaultProtocolClient(SCHEME);
  }
}

function generateState(): string {
  return randomBytes(24).toString('base64url');
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [k, v] of pending) {
    if (now - v.createdAt > STATE_TTL_MS) pending.delete(k);
  }
  for (const [k, v] of pendingMuirouter) {
    if (now - v.createdAt > STATE_TTL_MS) pendingMuirouter.delete(k);
  }
}

/**
 * 启动一次 connect：生成 state，打开浏览器到 /connect?state=...
 * 返回值仅说明"打开浏览器是否成功"；最终的 auto-login 通过
 * session:autoLogin 事件回到 renderer。
 */
export async function beginConnect(): Promise<{ ok: boolean; message?: string }> {
  pruneExpired();
  const state = generateState();
  pending.set(state, { state, createdAt: Date.now() });

  const cfg = getConfig();
  // connect 页住在 muicv.com（website worker），不在 api worker。
  // 用 muicvApiBase 推导：api.muicv.com → muicv.com；其它情况退到默认。
  const webBase = inferWebBase(cfg.muicvApiBase);
  const params = new URLSearchParams({
    state,
    redirect: `${SCHEME}://callback`,
    app: 'Mui简历桌面端',
  });
  const url = `${webBase}${CONNECT_PATH}?${params.toString()}`;

  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    pending.delete(state);
    return { ok: false, message: err instanceof Error ? err.message : 'open browser failed' };
  }
}

/**
 * 从 muicvApiBase（api worker URL）推导出 website 的 base URL。
 *
 * 用途：connect 授权页 + /api/me 都住在 website 上，桌面 app 只配了一个
 * muicvApiBase（api worker），需要派生一份 webBase 才能调那些。
 *
 * 也被 session.ts 复用 → 所以 export。
 */
export function inferWebBase(apiBase: string): string {
  try {
    const u = new URL(apiBase);
    if (u.hostname === 'api.muicv.com') return 'https://muicv.com';
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      // dev：website 默认 :3070（见 packages/website/package.json）
      return 'http://localhost:3070';
    }
    // 其它环境（自定义 domain）就直接拿同 host，去掉 api. 前缀
    if (u.hostname.startsWith('api.')) return `${u.protocol}//${u.hostname.slice(4)}`;
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return 'https://muicv.com';
  }
}

/**
 * 启动一次 muirouter OAuth 关联：生成 app_state，打开浏览器到 /api/muirouter/oauth/start。
 * muicv 服务端会带着 app_state 透传到 muirouter，授权完成后服务端 302 到
 * muicv://muirouter-linked?app_state=...&ok=1，OS 唤起 app，main 校验 app_state 后
 * 推 muirouter:linked 事件给 renderer。
 *
 * 前置条件：必须已经登录（muicvApiKey 在 session cookie 中），否则浏览器到达
 * /api/muirouter/oauth/start 会被 401 拒掉。
 */
export async function beginLinkMuirouter(): Promise<{ ok: boolean; message?: string }> {
  pruneExpired();
  const state = generateState();
  pendingMuirouter.set(state, { state, createdAt: Date.now() });

  const cfg = getConfig();
  const webBase = inferWebBase(cfg.muicvApiBase);
  const params = new URLSearchParams({ from: 'app', app_state: state });
  const url = `${webBase}${MUIROUTER_OAUTH_START_PATH}?${params.toString()}`;

  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch (err) {
    pendingMuirouter.delete(state);
    return { ok: false, message: err instanceof Error ? err.message : 'open browser failed' };
  }
}

/**
 * macOS 在 'open-url' 拿 deep link，Windows / Linux 在 second-instance 拿 argv，
 * 两边最终都喂给这个函数。
 *
 * 支持的 URL：
 *   - muicv://callback?state=xxx&key=mui_xxx —— 自动登录
 *   - muicv://muirouter-linked?app_state=xxx&ok=1 —— muirouter OAuth 关联完成
 *   - muicv://muirouter-linked?app_state=xxx&error=... —— muirouter OAuth 失败
 *   - muicv://set-default-template?template=t4-tech —— 网页预览页点"设为默认"
 */
export async function handleDeepLink(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.warn('[deep-link] invalid url', url);
    return;
  }
  if (parsed.protocol !== `${SCHEME}:`) return;

  const action = parsed.host || parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
  pruneExpired();

  if (action === 'callback') {
    await handleAutoLoginCallback(parsed);
  } else if (action === 'muirouter-linked') {
    await handleMuirouterLinked(parsed);
  } else if (action === 'set-default-template') {
    handleSetDefaultTemplate(parsed);
  } else {
    console.warn('[deep-link] unknown action', url);
    return;
  }

  // 把窗口拿到前台
  const win = mainWindowGetter();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
}

async function handleAutoLoginCallback(parsed: URL): Promise<void> {
  const state = parsed.searchParams.get('state');
  const key = parsed.searchParams.get('key');

  if (!state || !pending.has(state)) {
    pushAutoLogin({ status: 'invalid-key', message: 'state 不匹配，可能过期或被串改。重新登录。' });
    return;
  }
  pending.delete(state);

  if (!key) {
    pushAutoLogin({ status: 'invalid-key', message: '回调缺少 key 字段' });
    return;
  }

  const result = await loginWithKey(key);
  pushAutoLogin(result);
}

async function handleMuirouterLinked(parsed: URL): Promise<void> {
  const state = parsed.searchParams.get('app_state');
  const ok = parsed.searchParams.get('ok') === '1';
  const error = parsed.searchParams.get('error');

  if (!state || !pendingMuirouter.has(state)) {
    pushMuirouterLinked({ status: 'state-mismatch' });
    return;
  }
  pendingMuirouter.delete(state);

  if (ok) {
    pushMuirouterLinked({ status: 'ok' });
  } else {
    pushMuirouterLinked({ status: 'failed', reason: error ?? 'unknown' });
  }
}

/**
 * `muicv://set-default-template?template=t4-tech` —— 用户在网页预览页点"设为默认"。
 * 攻击面有限（只改本地 active profile 配置），不防 CSRF，但严格校验 template 合法。
 * 没激活 profile 时直接忽略并提示 renderer（让 UI 引导用户先选档案）。
 */
function handleSetDefaultTemplate(parsed: URL): void {
  const template = parsed.searchParams.get('template');
  if (!template || !isTemplateId(template)) {
    pushDefaultTemplateChanged({ ok: false, reason: 'invalid-template' });
    return;
  }
  const active = getActiveProfile();
  if (!active) {
    pushDefaultTemplateChanged({ ok: false, reason: 'no-active-profile' });
    return;
  }
  setProfileDefaultTemplate(active.id, template);
  pushDefaultTemplateChanged({ ok: true, profileId: active.id, profileName: active.name, template });
}

type DefaultTemplateChangedPayload =
  | { ok: true; profileId: string; profileName: string; template: string }
  | { ok: false; reason: 'invalid-template' | 'no-active-profile' };

function pushDefaultTemplateChanged(payload: DefaultTemplateChangedPayload): void {
  const win = mainWindowGetter();
  if (win && !win.isDestroyed()) {
    win.webContents.send('defaults:templateChanged', payload);
  }
}

function pushAutoLogin(result: SessionCheckResult): void {
  const win = mainWindowGetter();
  if (win && !win.isDestroyed()) {
    win.webContents.send('session:autoLogin', result);
  }
}

function pushMuirouterLinked(result: MuirouterLinkResult): void {
  const win = mainWindowGetter();
  if (win && !win.isDestroyed()) {
    win.webContents.send('muirouter:linked', result);
  }
}
