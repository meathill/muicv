import type { Metadata } from 'next';

import { HomePage } from './_home';
import { getDictionary } from './_i18n/dict';
import { pageMetadata } from './_page-meta';

// 首页走 ISR：HTML 由 OpenNext R2 缓存兜底，首屏不再为登录态加载 auth client。
// 登录态交给 /dashboard 入口处理。营销文案基本不变，1 周刷一次；边缘 Workers Cache 吃 s-maxage。
export const revalidate = 604800;

const dict = getDictionary('zh');
const { title, description } = dict.meta.home;

export const metadata: Metadata = pageMetadata({
  locale: 'zh',
  path: '/',
  // title.absolute 绕过 root 的 '%s · Mui简历' 模板，让首页用调好的整串标题。
  title: { absolute: title },
  description,
});

export default function WebsiteHomePage() {
  return <HomePage locale="zh" />;
}
