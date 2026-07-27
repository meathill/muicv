import type { Metadata } from 'next';

import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';

import { getDictionary } from '../(zh)/(marketing)/_i18n/dict';
import { fontDisplay, fontMono, fontSans } from '../_theme/fonts';
import { ORGANIZATION_SCHEMA, websiteSchema } from '../_theme/root-schema';
import { ThemeInitScript } from '../_theme/theme-init-script';
import '../globals.css';

// 英文营销子树独立的 root layout（Next.js "multiple root layouts" 模式）。
// 之前用 <div lang="en"> 包一层 workaround，因为 App Router 全站只能有一个 <html>；
// 现在 (zh)/(en) 是两个独立顶层路由分组，各自持有自己的 <html lang>，Ahrefs/爬虫读到的就是真实值。
const SITE_URL = 'https://muicv.com';
const dict = getDictionary('en');

export const metadata: Metadata = {
  // 每个 root layout 都要自己声明 metadataBase——不声明的话 openGraph/twitter 里的相对图片
  // 路径（如 DEFAULT_OPEN_GRAPH_IMAGE.url）解析不出绝对 URL，会 fallback 成 localhost。
  metadataBase: new URL(SITE_URL),
  // 英文页用 '%s · MuiCV' 模板（首页用 title.absolute 绕过）；default 给没设 title 的页兜底。
  title: { default: dict.meta.home.title, template: '%s · MuiCV' },
  description: dict.meta.home.description,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
    shortcut: '/icon.svg',
  },
};

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
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
