import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HomePage } from '@/app/(zh)/(marketing)/_home';
import { getDictionary } from '@/app/(zh)/(marketing)/_i18n/dict';
import { isLocale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { DEFAULT_OPEN_GRAPH_IMAGE, DEFAULT_TWITTER_IMAGE, alternateLanguages } from '@/app/(zh)/(marketing)/_page-meta';

export const revalidate = 3600;

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
  const { home } = getDictionary(locale).meta;
  return {
    // 首页 title 用 absolute，不走 layout 的 '%s · MuiCV' 模板。
    title: { absolute: home.title },
    description: home.description,
    alternates: { canonical: `/${locale}`, languages: { ...alternateLanguages('/'), 'x-default': '/' } },
    openGraph: {
      type: 'website',
      siteName: 'MuiCV',
      url: `${SITE_URL}/${locale}`,
      locale,
      title: home.title,
      description: home.description,
      images: [DEFAULT_OPEN_GRAPH_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: home.title,
      description: home.description,
      images: [DEFAULT_TWITTER_IMAGE],
    },
  };
}

export default async function LocaleHomePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') notFound();
  return <HomePage locale={locale} />;
}
