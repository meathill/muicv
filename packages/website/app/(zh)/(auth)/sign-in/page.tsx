import type { Metadata } from 'next';

import { getAuthFlags } from '@/lib/auth-flags';

import { AuthForm } from '../auth-form';

// 要 await 服务端 env，强制 SSR
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '登录',
  description: '登录 Mui简历，管理你的简历素材库与订阅。',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const flags = await getAuthFlags();
  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  // 防 open redirect：next 必须是站内相对路径
  const next = typeof nextRaw === 'string' && nextRaw.startsWith('/') ? nextRaw : undefined;
  return <AuthForm mode="sign-in" githubEnabled={flags.githubEnabled} next={next} />;
}
