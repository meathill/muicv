import type { Metadata } from 'next';

import { ConnectPage } from '@/components/connect/connect-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connect MuiCV',
  description: 'Confirm signing the MuiCV desktop app or browser extension in to your account.',
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ConnectPage lang="en" searchParams={searchParams} />;
}
