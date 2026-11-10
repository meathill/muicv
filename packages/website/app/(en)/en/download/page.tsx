import type { Metadata } from 'next';

import { getDictionary } from '@/app/(zh)/(marketing)/_i18n/dict';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { DownloadView } from '@/app/(zh)/(marketing)/download/_view';

export const revalidate = 300;

const dict = getDictionary('en');
const { title, description } = dict.meta.download;

export const metadata: Metadata = pageMetadata({
  locale: 'en',
  path: '/download',
  // 纯串 title，走 en layout 的 '%s · MuiCV' 模板。
  title,
  description,
});

export default function EnDownloadPage() {
  return <DownloadView locale="en" />;
}
