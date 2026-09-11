import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';

import { isBlogLocale } from '@/app/(zh)/(marketing)/_i18n/blog';
import { fontDisplay, fontMono, fontSans } from '../../_theme/fonts';
import { ORGANIZATION_SCHEMA, websiteSchema } from '../../_theme/root-schema';
import { ThemeInitScript } from '../../_theme/theme-init-script';
import '../../globals.css';

const SITE_URL = 'https://muicv.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
    shortcut: '/icon.svg',
  },
};

/**
 * 多语言子树根布局。zh 走 (zh)、en 走 (en) 既有静态子树，
 * 这里承接其余 locale 的 /<locale>/... 动态路由。
 */
export default async function LocaleRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isBlogLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <ThemeInitScript />
        <JsonLd data={ORGANIZATION_SCHEMA} />
        <JsonLd data={websiteSchema(locale === 'zh-CN' ? 'zh' : 'en')} />
      </head>
      <body className="bg-cream text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
