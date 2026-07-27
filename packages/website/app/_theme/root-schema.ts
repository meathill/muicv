import type { Locale } from '@/app/(zh)/(marketing)/_i18n/locale';

const SITE_URL = 'https://muicv.com';
const DESCRIPTION =
  '一站式 AI 求职平台：智能简历、岗位发现、模拟面试、就业辅导。素材存本地，数据由你掌控；可以接入你的 AI agent，也可以用我们的桌面 app。';

/** 全站默认 Organization 结构化数据。locale 无关（两个 root layout 原样共用），让 Google Knowledge Graph 能识别品牌。 */
export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Mui简历',
  alternateName: ['MuiCV', 'Mui CV', 'MuiCV.com'],
  url: SITE_URL,
  logo: `${SITE_URL}/brand/mui-logo.png`,
  description: DESCRIPTION,
};

/** WebSite schema，给 Google 提供潜在的 sitelinks search box 钩子。按 locale 区分 name/inLanguage。 */
export function websiteSchema(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: locale === 'en' ? 'MuiCV' : 'Mui简历',
    alternateName: ['MuiCV', 'Mui CV', 'MuiCV.com'],
    url: SITE_URL,
    inLanguage: locale === 'en' ? 'en' : 'zh-CN',
  };
}
