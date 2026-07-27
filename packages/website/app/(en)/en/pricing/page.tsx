import type { Metadata } from 'next';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { getPricingContent } from '@/app/(zh)/(marketing)/pricing/_content';
import { PricingView } from '@/app/(zh)/(marketing)/pricing/_view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({ locale: 'en', path: '/pricing', ...getPricingContent('en').meta });

export default async function EnPricingPage(props: { searchParams: Promise<{ interval?: string }> }) {
  const params = await props.searchParams;
  return <PricingView locale="en" intervalParam={params.interval} />;
}
