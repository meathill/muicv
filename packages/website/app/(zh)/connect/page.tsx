import type { Metadata } from 'next';

import { ConnectPage } from '@/components/connect/connect-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '连接 Mui简历',
  description: '确认 Mui简历桌面端或浏览器扩展登录到你的账号。',
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ConnectPage lang="zh" searchParams={searchParams} />;
}
