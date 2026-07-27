import type { Metadata } from 'next';

import { pageMetadata } from '../_page-meta';
import { AboutView, getAboutMeta } from './_view';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({ locale: 'zh', path: '/about', ...getAboutMeta('zh') });

export default function AboutPage() {
  return <AboutView locale="zh" />;
}
