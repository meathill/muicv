// 营销站 locale 基元。无内容、无 React 依赖，供 client header / 语言切换 / sitemap 复用。
// 加第 N 种语言：在 LOCALES 加成员 + 写一份词典 + 建一个子树（见 [[project_website_bilingual]]）。

export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'zh';

// 已经有英文版的路由（白名单）。英文页链到不在此列的路由时透传中文 URL，避免链到尚不存在的 /en/* 页。
// 加一个英文页 = 往这里加它的路径（如 Wave 2 加 '/pricing'、'/about'、'/contact'）。
export const EN_ROUTES = ['/', '/download', '/pricing', '/about', '/contact'];

/**
 * 把站内路径映射成当前 locale 对应的 href。
 * - zh：原样返回（默认语言不加前缀）。
 * - en：仅当路径有英文版时加 `/en` 前缀；否则透传（链到中文）。
 * - 纯锚点 / mailto / 外链 / /api：一律透传。
 */
export function localizedHref(locale: Locale, path: string): string {
  if (locale === 'zh') return path;
  if (path.startsWith('#') || path.startsWith('mailto:') || path.startsWith('http') || path.startsWith('/api')) {
    return path;
  }
  const base = path.split(/[?#]/)[0] || '/';
  const hasEn = EN_ROUTES.some((p) => base === p || base.startsWith(`${p}/`));
  if (!hasEn) return path;
  if (path === '/') return '/en';
  // '/#features' / '/?x' 这类首页带锚点/查询：去掉开头的 '/' 拼到 '/en' 后面 → '/en#features'。
  if (path.startsWith('/#') || path.startsWith('/?')) return `/en${path.slice(1)}`;
  return `/en${path}`;
}
