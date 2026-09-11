import type { AboutContent } from '../about/_view';
import type { ContactContent } from '../contact/_view';
import type { PricingContent } from '../pricing/_content';
import type { FaqItem } from './types';

/**
 * 一个语言的「页面内容」集合：营销首页词典之外的关于/联系/定价/FAQ 文案。
 * 每种语言一份，放在 _i18n/<locale>.tsx 里与词典并列导出，
 * 避免所有语言挤在同一个 Record 里（9 语言会有 2000+ 行）。
 */
export type LocaleContent = {
  about: AboutContent;
  contact: ContactContent;
  pricing: PricingContent;
  faq: FaqItem[];
};
