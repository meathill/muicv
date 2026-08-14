import type { Metadata } from 'next';

import { pageMetadata } from '../_page-meta';
import { getPricingContent } from './_content';
import { PricingView } from './_view';

export const metadata: Metadata = pageMetadata({ locale: 'zh', path: '/pricing', ...getPricingContent('zh').meta });

export default function PricingPage() {
  return <PricingView locale="zh" />;
}
