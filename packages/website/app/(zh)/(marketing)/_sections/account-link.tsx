'use client';

import type { ReactNode } from 'react';

import { useSession } from '@/lib/auth-client';

type Props = {
  className?: string;
  signedInHref?: string;
  signedInLabel?: string;
  signedOutHref?: string;
  signedOutLabel?: string;
  /** 追加在 label 后面的内容，比如箭头图标。 */
  children?: ReactNode;
};

/**
 * 营销页里的 "登录态文案 CTA" 小岛。
 * 抽成客户端小组件，让外层页面继续 ISR，登录态只在水合后用 useSession 补上。
 */
export function AccountLink({
  className,
  signedInHref = '/dashboard',
  signedInLabel = '进入个人中心',
  signedOutHref = '/sign-up',
  signedOutLabel = '创建账号',
  children,
}: Props) {
  const { data: session, isPending } = useSession();
  const isLoggedIn = !isPending && !!session?.user;
  return (
    <a href={isLoggedIn ? signedInHref : signedOutHref} className={className}>
      {isLoggedIn ? signedInLabel : signedOutLabel}
      {children}
    </a>
  );
}
