/**
 * 内容多语言（i18n）共用 locale 维度。website / api / cms 三端共用。
 *
 * 建模方式：**一行一语言**（同一篇文章的各语言译文是独立文档，靠 locale 字段区分），
 * 与 Payload 官方 localization 无关（本项目 Config.locale 为 null）。
 * CMS 的 posts / articles 集合都用这份枚举，避免两处漂移。
 *
 * 注意与网站 URL 前缀的区别：网站层用 `zh`（不带 -CN）做 URL 段，见
 * packages/website/app/(zh)/(marketing)/_i18n/locale.ts 的 cmsLocaleOf / localeOfCms。
 */
export const CONTENT_LOCALES = ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt', 'th', 'vi'] as const;

export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/** 默认语言（无 URL 前缀、种子内容的主语言）。 */
export const DEFAULT_CONTENT_LOCALE: ContentLocale = 'zh-CN';

export function isContentLocale(value: unknown): value is ContentLocale {
  return typeof value === 'string' && (CONTENT_LOCALES as readonly string[]).includes(value);
}

/**
 * 内容 locale → 站点 URL 前缀段。默认语言（zh-CN）不带前缀，其余用 locale 码。
 * sitemap / 页面 / 面包屑都从这里取，避免各处硬编码 `/en` 之类。
 */
export function contentLocalePrefix(locale: ContentLocale): string {
  return locale === DEFAULT_CONTENT_LOCALE ? '' : `/${locale}`;
}
