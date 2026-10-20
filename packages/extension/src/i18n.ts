import de from '../locales/de.json' with { type: 'json' };
import en from '../locales/en.json' with { type: 'json' };
import es from '../locales/es.json' with { type: 'json' };
import fr from '../locales/fr.json' with { type: 'json' };
import ja from '../locales/ja.json' with { type: 'json' };
import ptBR from '../locales/pt_BR.json' with { type: 'json' };
import th from '../locales/th.json' with { type: 'json' };
import vi from '../locales/vi.json' with { type: 'json' };
import zhCN from '../locales/zh_CN.json' with { type: 'json' };

/**
 * 扩展 UI 文案。扩展内走 chrome.i18n（构建时由 locales/*.json 生成 _locales/<locale>/messages.json），
 * 脱离扩展环境（预览 / 截图 / 单测）时用打包进来的同一份文案，`setFallbackLocale` 选语言。
 * 占位符写作 {0} {1}，生成 messages.json 时转成 chrome 的 $P0$ placeholders。
 */

export type MessageKey = keyof typeof en;

export const LOCALE_MESSAGES: Record<string, Record<MessageKey, string>> = {
  en,
  zh_CN: zhCN,
  ja,
  de,
  fr,
  es,
  pt_BR: ptBR,
  th,
  vi,
};

export const EXTENSION_LOCALES = Object.keys(LOCALE_MESSAGES);

let fallback: Record<MessageKey, string> = en;
let fallbackLocale = 'en';

export function setFallbackLocale(locale: string): void {
  const hit = LOCALE_MESSAGES[locale] ?? LOCALE_MESSAGES[locale.replace('-', '_')];
  if (hit) {
    fallback = hit;
    fallbackLocale = locale.replace('-', '_');
  }
}

function hasChromeI18n(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.i18n?.getMessage === 'function';
}

/** 当前 UI 语言（chrome 的 UI locale 或预览语言），用来决定数字格式和是否展示中文地域描述。 */
export function uiLocale(): string {
  if (hasChromeI18n()) return chrome.i18n.getUILanguage().replace('-', '_');
  return fallbackLocale;
}

function format(template: string, subs: Array<string | number>): string {
  return template.replace(/\{(\d)\}/g, (m, i: string) => String(subs[Number(i)] ?? m));
}

export function t(key: MessageKey, ...subs: Array<string | number>): string {
  if (hasChromeI18n()) {
    const msg = chrome.i18n.getMessage(key, subs.map(String));
    if (msg) return msg;
  }
  return format(fallback[key] ?? en[key], subs);
}

/** locales/*.json → chrome messages.json（构建脚本与测试共用）。 */
export function toChromeMessages(
  flat: Record<string, string>,
): Record<string, { message: string; placeholders?: Record<string, { content: string }> }> {
  const out: Record<string, { message: string; placeholders?: Record<string, { content: string }> }> = {};
  for (const [key, text] of Object.entries(flat)) {
    const indexes = [...new Set([...text.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1])))];
    const message = text.replace(/\$/g, '$$$$').replace(/\{(\d)\}/g, (_, i: string) => `$P${i}$`);
    out[key] = indexes.length
      ? { message, placeholders: Object.fromEntries(indexes.map((i) => [`p${i}`, { content: `$${i + 1}` }])) }
      : { message };
  }
  return out;
}
