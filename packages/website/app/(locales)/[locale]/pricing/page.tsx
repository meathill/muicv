import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { getPricingContent } from '@/app/(zh)/(marketing)/pricing/_content';
import { PricingView } from '@/app/(zh)/(marketing)/pricing/_view';

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
  return pageMetadata({ locale, path: '/pricing', ...getPricingContent(locale).meta });
}

export default async function LocalePricingPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') notFound();
  return <PricingView locale={locale} />;
}
