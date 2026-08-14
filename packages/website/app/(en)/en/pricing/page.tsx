import type { Metadata } from 'next';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { getPricingContent } from '@/app/(zh)/(marketing)/pricing/_content';
import { PricingView } from '@/app/(zh)/(marketing)/pricing/_view';

export const metadata: Metadata = pageMetadata({ locale: 'en', path: '/pricing', ...getPricingContent('en').meta });

export default function EnPricingPage() {
  return <PricingView locale="en" />;
}
