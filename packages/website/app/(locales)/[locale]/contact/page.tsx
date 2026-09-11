import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { ContactView, getContactMeta } from '@/app/(zh)/(marketing)/contact/_view';

export const revalidate = 3600;

type Params = { locale: string };

export async function generateStaticParams() {
  return [
    { locale: 'ja' },
    { locale: 'de' },
    { locale: 'fr' },
    { locale: 'es' },
    { locale: 'pt' },
    { locale: 'th' },
    { locale: 'vi' },
  ];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') return {};
  return pageMetadata({ locale, path: '/contact', ...getContactMeta(locale) });
}

export default async function LocaleContactPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') notFound();
  return <ContactView locale={locale} />;
}
