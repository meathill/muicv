import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getDictionary } from '@/app/(zh)/(marketing)/_i18n/dict';
import { isLocale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { alternateLanguages, DEFAULT_OPEN_GRAPH_IMAGE, DEFAULT_TWITTER_IMAGE } from '@/app/(zh)/(marketing)/_page-meta';
import { DownloadView } from '@/app/(zh)/(marketing)/download/_view';

export const revalidate = 300;

const SITE_URL = 'https://muicv.com';

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
  const { title, description } = getDictionary(locale).meta.download;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/download`,
      languages: { ...alternateLanguages('/download'), 'x-default': '/download' },
    },
    openGraph: {
      type: 'website',
      siteName: 'MuiCV',
      url: `${SITE_URL}/${locale}/download`,
      locale,
      title,
      description,
      images: [DEFAULT_OPEN_GRAPH_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_TWITTER_IMAGE] },
  };
}

export default async function LocaleDownloadPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') notFound();
  return <DownloadView locale={locale} />;
}
