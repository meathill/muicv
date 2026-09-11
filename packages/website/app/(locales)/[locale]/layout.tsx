import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';

import { getDictionary } from '@/app/(zh)/(marketing)/_i18n/dict';
import { isLocale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { fontDisplay, fontMono, fontSans } from '../../_theme/fonts';
import { ORGANIZATION_SCHEMA, websiteSchema } from '../../_theme/root-schema';
import { ThemeInitScript } from '../../_theme/theme-init-script';
import '../../globals.css';

const SITE_URL = 'https://muicv.com';

type Params = { locale: string };

/**
 * 多语言子树根布局。zh 走 (zh)、en 走 (en) 既有静态子树；
 * 这里承接其余 locale 的 /<locale>/... 动态路由（营销页 + 博客）。
 *
 * metadata 与 generateMetadata 不能同时导出，故根 layout 的 metadataBase / title 模板
 * 也一并放在 generateMetadata 里。
 */
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') return {};
  const { home } = getDictionary(locale).meta;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: home.title, template: '%s · MuiCV' },
    description: home.description,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    icons: {
      icon: { url: '/icon.svg', type: 'image/svg+xml' },
      shortcut: '/icon.svg',
    },
  };
}

export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === 'zh') notFound();

  return (
    <html lang={locale} className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <ThemeInitScript />
        <JsonLd data={ORGANIZATION_SCHEMA} />
        <JsonLd data={websiteSchema('en')} />
      </head>
      <body className="bg-cream text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
