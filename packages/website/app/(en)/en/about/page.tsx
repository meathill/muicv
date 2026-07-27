import type { Metadata } from 'next';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { AboutView, getAboutMeta } from '@/app/(zh)/(marketing)/about/_view';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({ locale: 'en', path: '/about', ...getAboutMeta('en') });

export default function EnAboutPage() {
  return <AboutView locale="en" />;
}
