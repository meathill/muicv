import type { Metadata } from 'next';

import { EN_ROUTES, LOCALES, LOCALIZED_ROUTES, type Locale, localizedHref } from './_i18n/locale';

const SITE_URL = 'https://muicv.com';

export const SOCIAL_IMAGE_ALT = 'MuiCV · AI 求职工作台——把真实经历整理成更好的简历';
export const DEFAULT_OPEN_GRAPH_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: SOCIAL_IMAGE_ALT,
};
export const DEFAULT_TWITTER_IMAGE = {
  url: '/twitter-image.png',
  width: 1200,
  height: 630,
  alt: SOCIAL_IMAGE_ALT,
};

/** hreflang 的 locale 键：默认语言用 zh-CN，其余与 URL 段同名。 */
function hreflangKey(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : locale;
}

/**
 * 由 LOCALIZED_ROUTES / EN_ROUTES 推导 hreflang：9 语言齐备的页面列全 9 条，
 * 只有英文版的列 zh/en，都没有的只列默认语言——避免指向 404（对 SEO 有害）。
 * zh/en 与新语言页共用同一函数，保证各语言页的 hreflang 互指对称。
 */
export function alternateLanguages(path: string): Record<string, string> {
  const base = path.split(/[?#]/)[0] || '/';
  const matches = (routes: readonly string[]) => routes.some((p) => base === p || base.startsWith(`${p}/`));
  const locales: Locale[] = matches(LOCALIZED_ROUTES) ? [...LOCALES] : matches(EN_ROUTES) ? ['zh', 'en'] : ['zh'];
  const languages: Record<string, string> = {};
  for (const locale of locales) languages[hreflangKey(locale)] = localizedHref(locale, path);
  return languages;
}

/**
 * 营销页统一 metadata：canonical 自指 + hreflang 互指 + 完整 openGraph/twitter。
 * title 为纯串，走各自 layout 的模板（zh ' · Mui简历' / 其它 ' · MuiCV'）。首页用 title.absolute。
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  /** 中文路径，如 '/about'；各语言 URL 由 localizedHref 推导。 */
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonical = localizedHref(locale, path);
  const languages = { ...alternateLanguages(path), 'x-default': path };
  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: locale === 'zh' ? 'Mui简历' : 'MuiCV',
      url: `${SITE_URL}${canonical}`,
      locale: locale === 'zh' ? 'zh_CN' : locale,
      title,
      description,
      images: [DEFAULT_OPEN_GRAPH_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
  };
}

// 单语页面（暂无 /en/... 对应版本）metadata：canonical 自指 + 完整 openGraph/twitter，
// 不放 hreflang languages（放了会指向一个不存在的 /en/... 404）。
// 一旦这批路由有了英文版，改用 pageMetadata()。
export function soloPageMetadata({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'Mui简历',
      url: `${SITE_URL}${path}`,
      locale: 'zh_CN',
      title,
      description,
      images: [DEFAULT_OPEN_GRAPH_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
  };
}
