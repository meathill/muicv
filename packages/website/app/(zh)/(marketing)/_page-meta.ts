import type { Metadata } from 'next';

import type { Locale } from './_i18n/locale';

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

// 双语营销页统一 metadata：canonical 自指 + hreflang 互指 + 完整 openGraph/twitter。
// title 为纯串，走各自 layout 的模板（zh ' · Mui简历' / en ' · MuiCV'）。首页用 title.absolute 不走这里。
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  /** 中文路径，如 '/about'；英文路径自动推导为 '/en' 前缀。 */
  path: string;
  title: string;
  description: string;
}): Metadata {
  const enPath = path === '/' ? '/en' : `/en${path}`;
  const canonical = locale === 'en' ? enPath : path;
  return {
    title,
    description,
    alternates: { canonical, languages: { 'zh-CN': path, en: enPath, 'x-default': path } },
    openGraph: {
      type: 'website',
      siteName: locale === 'en' ? 'MuiCV' : 'Mui简历',
      url: `${SITE_URL}${canonical}`,
      locale: locale === 'en' ? 'en_US' : 'zh_CN',
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
