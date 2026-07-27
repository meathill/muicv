import type { Metadata } from 'next';

import { pageMetadata } from '../_page-meta';
import { ContactView, getContactMeta } from './_view';

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({ locale: 'zh', path: '/contact', ...getContactMeta('zh') });

export default function ContactPage() {
  return <ContactView locale="zh" />;
}
