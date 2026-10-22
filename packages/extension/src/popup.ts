import type { JobSubmitVisibility } from '@muicv/shared';
import type { LoginReply } from './background.ts';
import type { ExtractedPage } from './extract/page.ts';
import { setFallbackLocale, t, uiLocale } from './i18n.ts';
import {
  API_KEY_PATTERN,
  ApiError,
  fetchMe,
  getSubmission,
  loadSettings,
  type Settings,
  saveSettings,
  submitJobs,
} from './popup/api.ts';
import { mockState } from './popup/mock.ts';
import { addPending, latestPending, type PendingSubmission, pollSubmission, removePending } from './popup/pending.ts';
import { type PageInfo, type PopupState, render } from './popup/view.ts';

/**
 * popup 控制器：读取当前页（activeTab + scripting 注入）→ 选择公共 / 私藏 → 提交到 muicv API。
 * 需要 AI 的提交在服务端排队：id 存进 chrome.storage，带退避轮询；关掉再打开会接着查结果。
 */

const root = document.getElementById('app') as HTMLElement;
const settingsBtn = document.getElementById('settings') as HTMLButtonElement | null;
const VIS_KEY = 'muicvVisibility';

let state: PopupState = { kind: 'loading' };
let settings: Settings = { apiKey: '', apiBase: '' };
let page: ExtractedPage | null = null;
let visibility: JobSubmitVisibility = 'public';

function localizeChrome(): void {
  document.documentElement.lang = uiLocale().replace('_', '-');
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.textContent = t('tagline');
  const brand = document.getElementById('brand');
  if (brand) brand.textContent = t('extName').split(/\s[–·]\s/)[0] ?? 'Mui';
  settingsBtn?.setAttribute('title', t('settingsTitle'));
}

function setState(next: PopupState): void {
  state = next;
  root.innerHTML = render(state);
  bind();
}

function bind(): void {
  for (const el of Array.from(root.querySelectorAll<HTMLButtonElement>('[data-visibility]'))) {
    el.addEventListener('click', () => {
      visibility = el.dataset.visibility === 'private' ? 'private' : 'public';
      void globalThis.chrome?.storage?.local.set({ [VIS_KEY]: visibility });
      if (state.kind === 'ready') setState({ ...state, visibility });
    });
  }
  root.querySelector('#submit')?.addEventListener('click', () => void submit());
  root.querySelector('#retry')?.addEventListener('click', () => void start());
  root.querySelector('#save-key')?.addEventListener('click', () => void saveKey());
  root.querySelector('#sign-in')?.addEventListener('click', () => void signIn());
  root.querySelector('#sign-out')?.addEventListener('click', () => void signOut());
  root.querySelector('#back')?.addEventListener('click', () => void start());
}

/** 交给后台跑 launchWebAuthFlow（授权窗口弹出时 popup 可能被关掉，结果经 storage 回来）。 */
async function signIn(): Promise<void> {
  setState({ kind: 'signed-out', signingIn: true });
  const reply = (await chrome.runtime
    .sendMessage({ type: 'muicv-login', locale: uiLocale() })
    .catch((err: unknown) => ({ ok: false, error: String(err) }))) as LoginReply | undefined;
  if (reply?.ok) {
    await start();
    return;
  }
  setState({ kind: 'signed-out', error: t('loginFailed') });
}

async function signOut(): Promise<void> {
  settings = { ...settings, apiKey: '' };
  await saveSettings(settings);
  setState({ kind: 'signed-out' });
}

async function showAccount(): Promise<void> {
  if (!settings.apiKey) {
    setState({ kind: 'signed-out' });
    return;
  }
  setState({ kind: 'loading' });
  try {
    const me = await fetchMe(settings);
    setState({ kind: 'account', name: me.name, balance: me.balance });
  } catch (err) {
    showError(err, null);
  }
}

async function saveKey(): Promise<void> {
  const apiKey = root.querySelector<HTMLInputElement>('#api-key')?.value.trim() ?? '';
  if (!API_KEY_PATTERN.test(apiKey)) {
    setState({ kind: 'signed-out', manual: true, error: t('keyInvalidFormat') });
    return;
  }
  const next = { ...settings, apiKey };
  try {
    await fetchMe(next);
  } catch (err) {
    setState({ kind: 'signed-out', manual: true, error: err instanceof Error ? err.message : t('keyVerifyFailed') });
    return;
  }
  settings = next;
  await saveSettings(settings);
  await start();
}

async function extractActiveTab(): Promise<ExtractedPage | string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/i.test(tab.url)) return t('unsupportedPage');
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['inject.js'] });
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (globalThis as { __muicvExtractPage?: () => unknown }).__muicvExtractPage?.() ?? null,
    });
    return (res?.result as ExtractedPage | null | undefined) ?? t('extractFailed');
  } catch (err) {
    return t('pageBlocked', err instanceof Error ? err.message : String(err));
  }
}

function showError(err: unknown, current: PageInfo | null): void {
  if (err instanceof ApiError && err.status === 401) {
    setState({ kind: 'signed-out', error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  setState({ kind: 'error', page: current, message, needsTopup: err instanceof ApiError && err.status === 402 });
}

async function follow(pending: PendingSubmission, immediate: boolean): Promise<void> {
  const info: PageInfo = { url: pending.url, title: pending.title };
  setState({ kind: 'submitting', page: info, visibility: pending.visibility, step: 1, queued: true });
  const outcome = await pollSubmission(
    async () => {
      try {
        return await getSubmission(settings, pending.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    { immediate },
  );
  if (outcome.kind === 'timeout') {
    setState({ kind: 'error', page: info, message: t('errTimeout') });
    return;
  }
  await removePending(chrome.storage.local, pending.id);
  if (outcome.kind === 'missing') {
    await start();
    return;
  }
  setState({ kind: 'result', page: info, result: outcome.result });
}

async function submit(): Promise<void> {
  if (!page) return;
  const current = page;
  setState({ kind: 'submitting', page: current, visibility, step: 1 });
  try {
    const outcome = await submitJobs(settings, { ...current, visibility });
    if (outcome.kind === 'done') {
      setState({ kind: 'result', page: current, result: outcome.result });
      return;
    }
    const pending = { id: outcome.id, url: current.url, title: current.title, visibility, createdAt: Date.now() };
    await addPending(chrome.storage.local, pending);
    await follow(pending, false);
  } catch (err) {
    showError(err, current);
  }
}

async function start(): Promise<void> {
  setState({ kind: 'loading' });
  settings = await loadSettings();
  const stored = (await chrome.storage.local.get(VIS_KEY))[VIS_KEY];
  visibility = stored === 'private' ? 'private' : 'public';
  if (!settings.apiKey) {
    setState({ kind: 'signed-out' });
    return;
  }
  const pending = await latestPending(chrome.storage.local);
  if (pending) {
    await follow(pending, true).catch((err: unknown) => showError(err, { url: pending.url, title: pending.title }));
    return;
  }
  const extracted = await extractActiveTab();
  if (typeof extracted === 'string') {
    setState({ kind: 'unsupported', message: extracted });
    return;
  }
  page = extracted;
  setState({ kind: 'ready', page, visibility, balance: null });
  const me = await fetchMe(settings).catch(() => null);
  if (me && state.kind === 'ready') setState({ ...state, balance: me.balance });
}

settingsBtn?.addEventListener('click', () => void showAccount());

if (typeof chrome === 'undefined' || !chrome.tabs) {
  // 预览模式：popup.html?state=ready|submitting|queued|result|empty|error|key&lang=en
  const params = new URLSearchParams(location.search);
  setFallbackLocale(params.get('lang') ?? 'zh_CN');
  localizeChrome();
  setState(mockState(params.get('state'), uiLocale()));
} else {
  localizeChrome();
  // 后台登录成功时 popup 若仍开着，自动刷新
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.muicvSettings && state.kind === 'signed-out') void start();
  });
  void start();
}
