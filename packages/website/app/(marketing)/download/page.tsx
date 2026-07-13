import type { Metadata } from 'next';

import { DEFAULT_OPEN_GRAPH_IMAGE, DEFAULT_TWITTER_IMAGE } from '../_page-meta';
import { getDictionary } from '../_i18n/dict';
import { DownloadView } from './_view';

// Header 客户端读 session 之后页面可走 ISR。GitHub fetch 内部 revalidate 300 决定数据新鲜度，
// 这里再加一层页面级 revalidate 让 OpenNext R2 兜底 HTML 缓存。
export const revalidate = 300;

const SITE_URL = 'https://muicv.com';
const dict = getDictionary('zh');
const { title, description } = dict.meta.download;

export const metadata: Metadata = {
  // 纯串 title，走 root 的 '%s · Mui简历' 模板 → 品牌后缀。
  title,
  description,
  alternates: {
    canonical: '/download',
    languages: { 'zh-CN': '/download', en: '/en/download', 'x-default': '/download' },
  },
  openGraph: {
    type: 'website',
    siteName: 'Mui简历',
    url: `${SITE_URL}/download`,
    locale: 'zh_CN',
    title,
    description,
    images: [DEFAULT_OPEN_GRAPH_IMAGE],
  },
  twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
};

export default function DownloadPage() {
  return <DownloadView locale="zh" />;
}
