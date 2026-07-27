import type { Metadata } from 'next';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { ContactView, getContactMeta } from '@/app/(zh)/(marketing)/contact/_view';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({ locale: 'en', path: '/contact', ...getContactMeta('en') });

export default function EnContactPage() {
  return <ContactView locale="en" />;
}
