import type { Metadata } from 'next';

import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';

import { fontDisplay, fontMono, fontSans } from '../_theme/fonts';
import { ORGANIZATION_SCHEMA, websiteSchema } from '../_theme/root-schema';
import { ThemeInitScript } from '../_theme/theme-init-script';
import '../globals.css';

const SITE_URL = 'https://muicv.com';
const TITLE = 'MuiCV — AI 简历生成器 | 程序员简历模板、英文简历在线制作';
const DESCRIPTION =
  'MuiCV（Mui简历）是一站式 AI 求职与简历生成平台：提供程序员简历模板、AI 简历优化润色、英文简历在线制作与一键导出 A4 PDF。素材本地保存，隐私安全可控。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · Mui简历',
  },
  description: DESCRIPTION,
  applicationName: 'Mui简历',
  keywords: [
    'AI简历生成器',
    '程序员简历模板',
    '英文简历在线制作',
    'AI简历制作',
    '简历模板',
    'AI resume builder',
    '软件工程师简历',
    '在线简历生成',
    '一键PDF导出',
    'AI求职',
    '模拟面试',
    '简历优化',
    'ATS简历',
    'resume',
    'cv',
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
    icon: { url: '/icon.svg', type: 'image/svg+xml' },
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

export default function ZhRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}>
      <head>
        <ThemeInitScript />
        <JsonLd data={ORGANIZATION_SCHEMA} />
        <JsonLd data={websiteSchema('zh')} />
      </head>
      <body className="bg-cream text-ink antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
