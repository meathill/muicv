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
 * 已有本地化版本的路由（白名单）。非默认语言链到不在此列的路径时透传默认语言 URL，
 * 避免链到不存在的页（/ja/skills、/ja/dashboard、/ja/privacy 等尚未本地化）。
 * 加一个本地化页面 = 往这里加它的路径。
 */
export const LOCALIZED_ROUTES = ['/', '/download', '/pricing', '/about', '/contact', '/templates', '/posts'];

/**
 * 把站内路径映射成当前 locale 对应的 href。
 * - zh：原样返回（默认语言不加前缀）。
 * - 其它语言：仅当路径有本地化版本时加 `/<locale>` 前缀；否则透传（链到默认语言）。
 * - 纯锚点 / mailto / 外链 / /api：一律透传。
 */
export function localizedHref(locale: Locale, path: string): string {
  if (locale === 'zh') return path;
  if (path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('http') || path.startsWith('/api')) {
    return path;
  }
  const base = path.split(/[?#]/)[0] || '/';
  const isLocalized = LOCALIZED_ROUTES.some((p) => base === p || base.startsWith(`${p}/`));
  if (!isLocalized) return path;
  if (path === '/') return `/${locale}`;
  // '/#features' / '/?x' 这类首页带锚点/查询：去掉开头的 '/' 拼到 '/<locale>' 后面。
  if (path.startsWith('/#') || path.startsWith('/?')) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}

export { CONTENT_LOCALES };
