/**
 * 扩展登录：复用网站的 /connect 授权页（桌面端同款）。
 *   1. 生成随机 state，launchWebAuthFlow 打开 https://muicv.com[/en]/connect?state&redirect=<identity 回跳>&app=<浏览器>
 *   2. 用户在网站登录并点"允许" → 网站生成 mui_ key，跳到 <回跳>?state=…&key=…
 *   3. 浏览器在授权窗口里拦截这个回跳，把 URL 交回扩展；校验 state 和 key 格式后存进 chrome.storage.local
 * 回跳地址由 identity API 给出（Chrome/Edge: https://<扩展 id>.chromiumapp.org/，Firefox: https://<hash>.extensions.allizom.org/），
 * 只有本扩展能收到，不需要写死扩展 id。
 */

/** 与 popup/api.ts 的 API_KEY_PATTERN 一致（那边有 node 跑不了的 TS 语法，单测不便引入）。 */
const KEY_PATTERN = /^mui_[A-Za-z0-9]{32}$/;

export const CONNECT_BASE = 'https://muicv.com';

export function browserName(ua = globalThis.navigator?.userAgent ?? ''): string {
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  return 'Chrome';
}

export function connectUrl(state: string, redirect: string, locale: string, app: string): string {
  const base = locale.toLowerCase().startsWith('zh') ? CONNECT_BASE : `${CONNECT_BASE}/en`;
  const q = new URLSearchParams({ state, redirect, app });
  return `${base}/connect?${q.toString()}`;
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 从回跳 URL 取出 key；state 不符、来源不对或格式不对都返回 null。 */
export function parseCallback(responseUrl: string, redirect: string, state: string): string | null {
  let url: URL;
  try {
    url = new URL(responseUrl);
  } catch {
    return null;
  }
  const expected = new URL(redirect);
  if (url.origin !== expected.origin) return null;
  if (url.searchParams.get('state') !== state) return null;
  const key = url.searchParams.get('key') ?? '';
  return KEY_PATTERN.test(key) ? key : null;
}
