import type { Metadata } from 'next';

import { HomePage } from '@/app/(zh)/(marketing)/_home';
import { getDictionary } from '@/app/(zh)/(marketing)/_i18n/dict';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';

export const revalidate = 604800;

const dict = getDictionary('en');
const { title, description } = dict.meta.home;

export const metadata: Metadata = pageMetadata({
  locale: 'en',
  path: '/',
  title: { absolute: title },
  description,
});

export default function EnHomePage() {
  return <HomePage locale="en" />;
}
