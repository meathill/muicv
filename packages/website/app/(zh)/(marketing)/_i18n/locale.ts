import { CONTENT_LOCALES, type ContentLocale } from '@muicv/shared';

// 营销站 locale 基元。无内容、无 React 依赖，供 client header / 语言切换 / sitemap 复用。
// 加第 N 种语言：写一份词典 + 页面文案 + 在 dict.ts / 各页注册（见 [[project_website_i18n]]）。

/** 站点语言。zh 是无前缀默认语言；其余与 URL 前缀段同名。 */
export const LOCALES = ['zh', 'en', 'ja', 'de', 'fr', 'es', 'pt', 'th', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'zh';

/** 非默认语言（需要 URL 前缀、且有自己的页面子树）。 */
export const PREFIXED_LOCALES = LOCALES.filter((locale): locale is Exclude<Locale, 'zh'> => locale !== 'zh');

/** 站点语言 → CMS 内容语言（zh ⇄ zh-CN 的写法差异只在这里转换）。 */
export function toContentLocale(locale: Locale): ContentLocale {
  return locale === 'zh' ? 'zh-CN' : locale;
}

/** CMS 内容语言 → 站点语言（反向映射，供 blog 路由与 sitemap 用）。 */
export function fromContentLocale(locale: ContentLocale): Locale {
  return locale === 'zh-CN' ? 'zh' : locale;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * 有英文版的路由（但不是 9 语言都有）。非默认语言链到这类路径时回退到英文版，
 * 而不是落到中文页——比给日本用户看中文页更合理。
 * 目前含模板库（模板数据只有 zh/en，本地化需另译 8 个模板的内容，属独立内容工程）。
 */
export const EN_ROUTES = ['/templates'];

/**
 * 9 语言都有本地化版本的路由（白名单）。加一个本地化页面 = 往这里加它的路径。
 */
export const LOCALIZED_ROUTES = ['/', '/download', '/pricing', '/about', '/contact', '/posts'];

/**
 * 把站内路径映射成当前 locale 对应的 href。优先级：
 *   1. 该路径有本语言版本 → `/<locale>` 前缀
 *   2. 该路径只有英文版 → `/en` 前缀（英文兜底）
 *   3. 都没有 → 透传（落到默认语言页）
 * - zh：原样返回（默认语言不加前缀）。
 * - 纯锚点 / mailto / 外链 / /api：一律透传。
 */
export function localizedHref(locale: Locale, path: string): string {
  if (locale === 'zh') return path;
  if (path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('http') || path.startsWith('/api')) {
    return path;
  }
  const base = path.split(/[?#]/)[0] || '/';
  const matches = (routes: readonly string[]) => routes.some((p) => base === p || base.startsWith(`${p}/`));

  if (matches(LOCALIZED_ROUTES)) return withPrefix(`/${locale}`, path);
  if (matches(EN_ROUTES)) return withPrefix('/en', path);
  return path;
}

/** '/#features' / '/?x' 这类带锚点/查询的首页路径，去掉开头 '/' 再拼前缀。 */
function withPrefix(prefix: string, path: string): string {
  if (path === '/') return prefix;
  if (path.startsWith('/#') || path.startsWith('/?')) return `${prefix}${path.slice(1)}`;
  return `${prefix}${path}`;
}

export { CONTENT_LOCALES };
