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
    // 无真实评分，绝不放 aggregateRating / review（假评分违规）。免费用 offers price 0 表达。
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
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
