import { browserName, connectUrl, parseCallback, randomState } from './auth.ts';
import { loadSettings, saveSettings } from './popup/api.ts';

/**
 * 后台：执行 launchWebAuthFlow。放在后台而不是 popup 里，因为授权窗口一出现 popup 就会关闭；
 * 登录结果写进 chrome.storage，popup 重新打开（或仍开着时监听 storage 变化）即可看到已登录。
 */

export type LoginMessage = { type: 'muicv-login'; locale: string };
export type LoginReply = { ok: true } | { ok: false; error: string };

async function login(locale: string): Promise<LoginReply> {
  const state = randomState();
  const redirect = chrome.identity.getRedirectURL('callback');
  let responseUrl: string | undefined;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url: connectUrl(state, redirect, locale, browserName()),
      interactive: true,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  const key = responseUrl ? parseCallback(responseUrl, redirect, state) : null;
  if (!key) return { ok: false, error: 'invalid-callback' };
  const settings = await loadSettings();
  await saveSettings({ ...settings, apiKey: key });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message: LoginMessage, _sender, reply: (r: LoginReply) => void) => {
  if (message?.type !== 'muicv-login') return false;
  void login(message.locale).then(reply);
  return true;
});
