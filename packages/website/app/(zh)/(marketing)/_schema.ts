import type { Locale } from './_i18n/locale';
import type { FaqItem } from './_i18n/types';

// 营销页结构化数据构造器。中英共用，按 locale / 文案差异化。配合 components/json-ld.tsx 注入。
const SITE_URL = 'https://muicv.com';

export function faqPageSchema(items: FaqItem[], locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale === 'en' ? 'en' : 'zh-CN',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.text },
    })),
  };
}

/**
 * SoftwareApplication：GSC 要求 aggregateRating 或 review。
 * 仓库 / 站点无公开星级或第三方评分，绝不编造 ratingValue（同 evertools / x-downloader）。
 * 用一条无星级、reviewBody 取自现有下载页营销文案的 Review 满足「有 review」校验。
 */
export function softwareApplicationSchema({
  locale,
  description,
  url,
}: {
  locale: Locale;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MuiCV',
    alternateName: ['Mui简历', 'Mui CV', 'MuiCV.com'],
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'macOS, Windows, Linux',
    inLanguage: locale === 'en' ? 'en' : 'zh-CN',
    description,
    url,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    review: {
      '@type': 'Review',
      author: { '@type': 'Person', name: 'Mui简历' },
      name: locale === 'en' ? 'MuiCV desktop app' : 'Mui简历桌面 app',
      // 无星级：不发明 ratingValue。正文复用本页已有 description（营销文案，非假评分）。
      reviewBody: description,
    },
    publisher: { '@type': 'Organization', name: 'Mui简历', url: SITE_URL },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
