import type { Metadata } from 'next';

import { HomePage } from '../_home';
import { getDictionary } from '../_i18n/dict';
import { DEFAULT_OPEN_GRAPH_IMAGE, DEFAULT_TWITTER_IMAGE } from '../_page-meta';

export const revalidate = 3600;

const SITE_URL = 'https://muicv.com';
const dict = getDictionary('en');
const { title, description } = dict.meta.home;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/en', languages: { 'zh-CN': '/', en: '/en', 'x-default': '/' } },
  openGraph: {
    type: 'website',
    siteName: 'MuiCV',
    url: `${SITE_URL}/en`,
    locale: 'en_US',
    title,
    description,
    images: [DEFAULT_OPEN_GRAPH_IMAGE],
  },
  twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
};

export default function EnHomePage() {
  return <HomePage locale="en" />;
}
