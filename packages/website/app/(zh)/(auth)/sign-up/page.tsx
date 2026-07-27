import type { Metadata } from 'next';

import { getAuthFlags } from '@/lib/auth-flags';

import { AuthForm } from '../auth-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '注册',
  description: '注册 Mui简历账号，未来可解锁桌面 app + muirouter 余额管理。',
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flags = await getAuthFlags();
  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof nextRaw === 'string' && nextRaw.startsWith('/') ? nextRaw : undefined;
  return <AuthForm mode="sign-up" githubEnabled={flags.githubEnabled} next={next} />;
}
