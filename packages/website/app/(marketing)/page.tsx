import type { Metadata } from 'next';

import { HomePage } from './_home';
import { getDictionary } from './_i18n/dict';

// 首页走 ISR：HTML 由 OpenNext R2 缓存兜底，首屏不再为登录态加载 auth client。
// 登录态交给 /dashboard 入口处理。1 小时刷一次足够营销文案的更新节奏。
export const revalidate = 3600;

const SITE_URL = 'https://muicv.com';
const dict = getDictionary('zh');
const { title, description } = dict.meta.home;

export const metadata: Metadata = {
  // title.absolute 绕过 root 的 '%s · Mui简历' 模板，让首页用调好的整串标题。
  title: { absolute: title },
  description,
  alternates: { canonical: '/', languages: { 'zh-CN': '/', en: '/en', 'x-default': '/' } },
  // openGraph 是 key 级整体替换：必须补全 root 的字段，否则丢 type/siteName/url/locale。
  openGraph: {
    type: 'website',
    siteName: 'Mui简历',
    url: SITE_URL,
    locale: 'zh_CN',
    title,
    description,
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function WebsiteHomePage() {
  return <HomePage locale="zh" />;
}
