/**
 * /connect 授权回跳地址白名单。
 *   - muicv://…                              桌面端 deep link
 *   - https://<扩展 id>.chromiumapp.org/…     Chrome / Edge 扩展（chrome.identity.launchWebAuthFlow）
 *   - https://<hash>.extensions.allizom.org/… Firefox 扩展（browser.identity.launchWebAuthFlow）
 * 后两个域名不会真的被访问：浏览器在 identity 授权窗口里拦截跳转，只交给对应扩展。
 */

export type ConnectTarget = 'desktop' | 'extension';

const EXTENSION_HOST = /^[a-z0-9]{16,64}\.(chromiumapp\.org|extensions\.allizom\.org)$/;

export function connectTarget(redirect: string): ConnectTarget | null {
  if (redirect.startsWith('muicv://')) return 'desktop';
  let url: URL;
  try {
    url = new URL(redirect);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  return EXTENSION_HOST.test(url.hostname) ? 'extension' : null;
}

/** state 与 key 拼进回跳地址（query；扩展在 launchWebAuthFlow 返回的 URL 里读取并校验 state）。 */
export function buildConnectRedirect(redirect: string, state: string, key: string): string {
  const sep = redirect.includes('?') ? '&' : '?';
  return `${redirect}${sep}state=${encodeURIComponent(state)}&key=${encodeURIComponent(key)}`;
}
