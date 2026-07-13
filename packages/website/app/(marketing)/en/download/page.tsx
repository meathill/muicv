import type { Metadata } from 'next';

import { getDictionary } from '../../_i18n/dict';
import { DEFAULT_OPEN_GRAPH_IMAGE, DEFAULT_TWITTER_IMAGE } from '../../_page-meta';
import { DownloadView } from '../../download/_view';

export const revalidate = 300;

const SITE_URL = 'https://muicv.com';
const dict = getDictionary('en');
const { title, description } = dict.meta.download;

export const metadata: Metadata = {
  // 纯串 title，走 en layout 的 '%s · MuiCV' 模板。
  title,
  description,
  alternates: {
    canonical: '/en/download',
    languages: { 'zh-CN': '/download', en: '/en/download', 'x-default': '/download' },
  },
  openGraph: {
    type: 'website',
    siteName: 'MuiCV',
    url: `${SITE_URL}/en/download`,
    locale: 'en_US',
    title,
    description,
    images: [DEFAULT_OPEN_GRAPH_IMAGE],
  },
  twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
};

export default function EnDownloadPage() {
  return <DownloadView locale="en" />;
}
