import type { Metadata } from 'next';

import { pageMetadata } from '../_page-meta';
import { getPricingContent } from './_content';
import { PricingView } from './_view';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({ locale: 'zh', path: '/pricing', ...getPricingContent('zh').meta });

export default async function PricingPage(props: { searchParams: Promise<{ interval?: string }> }) {
  const params = await props.searchParams;
  return <PricingView locale="zh" intervalParam={params.interval} />;
}
