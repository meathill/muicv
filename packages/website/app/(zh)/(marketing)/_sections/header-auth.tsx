'use client';

import { useSession } from '@/lib/auth-client';

import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { ArrowUpRight } from '../_icons';

type Props = {
  locale: Locale;
  nav: Dictionary['nav'];
};

/**
 * 营销页顶部导航的登录态操作区。
 * 抽成客户端小组件，让外层 Header 继续保持纯 Server Component，
 * 避免整头组件被打包进客户端，并在水合后动态切换登录态文案。
 */
export function HeaderAuth({ locale, nav }: Props) {
  const { data: session, isPending } = useSession();
  const isLoggedIn = !isPending && !!session?.user;

  if (isLoggedIn) {
    return (
      <a
        href={localizedHref(locale, '/dashboard')}
        className="press inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-yellow px-3 py-1.5 font-semibold whitespace-nowrap text-ink md:px-3.5"
      >
        {nav.console}
        <ArrowUpRight />
      </a>
    );
  }

  return (
    <>
      <a
        href={localizedHref(locale, '/sign-in')}
        className="hidden rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink sm:inline-block"
      >
        {nav.signIn}
      </a>
      <a
        href={localizedHref(locale, '/sign-up')}
        className="press inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-yellow px-3 py-1.5 font-semibold whitespace-nowrap text-ink md:px-3.5"
      >
        {nav.signUp}
        <ArrowUpRight />
      </a>
    </>
  );
}
