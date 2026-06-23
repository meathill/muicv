import type { Metadata } from 'next';
import { Fraunces, JetBrains_Mono, Nunito } from 'next/font/google';

import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';

import { ThemeInitScript } from './_theme/theme-init-script';
import './globals.css';

const SITE_URL = 'https://muicv.com';
const TITLE = 'Mui简历 — 找到更好工作的 AI 求职平台';
const DESCRIPTION =
  '一站式 AI 求职平台：智能简历、岗位发现、模拟面试、就业辅导。素材存本地，数据由你掌控；可以接入你的 AI agent，也可以用我们的桌面 app。';

/** 全站默认 Organization 结构化数据。让 Google Knowledge Graph 能识别品牌。 */
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Mui简历',
  alternateName: 'MuiCV',
  url: SITE_URL,
  logo: `${SITE_URL}/brand/mui-logo.png`,
  description: DESCRIPTION,
};

/** WebSite schema，给 Google 提供潜在的 sitelinks search box 钩子。 */
const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mui简历',
  url: SITE_URL,
  inLanguage: 'zh-CN',
};

// Display serif: Fraunces 是 variable font，opsz/SOFT 轴帮我们实现优雅 italic
const fontDisplay = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Body sans: Nunito，圆润 friendly，配柯基卡通气质
const fontSans = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Mono：仅终端 / 代码块用
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · Mui简历',
  },
  description: DESCRIPTION,
  applicationName: 'Mui简历',
  keywords: [
    '简历',
    'resume',
    'cv',
    '求职',
    'job search',
    '岗位匹配',
    '模拟面试',
    'mock interview',
    '就业辅导',
    'cover letter',
    'AI 求职',
    'AI agent',
  ],
  authors: [{ name: 'Mui简历' }],
  creator: 'Mui简历',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Mui简历',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  // 浏览器仍会请求 /favicon.ico（旧标准），显式指向 SVG icon 避免 404。
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon.svg' }],
    shortcut: '/icon.svg',
  },
  // GSC / Bing 验证 token：从 env 读，没设置就跳过——本地 / preview 不写。
  // 拿到验证 token 后，把它放进部署平台的 env vars（NEXT_PUBLIC_* 前缀让构建期能内联）。
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <ThemeInitScript />
        <JsonLd data={ORGANIZATION_SCHEMA} />
        <JsonLd data={WEBSITE_SCHEMA} />
      </head>
      <body className="bg-cream text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
