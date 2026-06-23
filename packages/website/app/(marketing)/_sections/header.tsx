import { CorgiMascot } from '@/components/corgi-mascot';

import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { ArrowUpRight } from '../_icons';
import { LangSwitch } from './lang-switch';

// zh 默认内联在此（本就是 header 原有的硬编码数据），避免把整个词典 bundle 进客户端。
// 英文页通过 props 覆盖 brand/nav。
const DEFAULT_BRAND: Dictionary['brand'] = { name: 'Mui简历', by: 'by Mui 🐾' };
const DEFAULT_NAV: Dictionary['nav'] = {
  links: [
    { label: '文章', href: '/posts/jobs' },
    { label: 'Skill', href: '/skills' },
    { label: '价格', href: '/pricing' },
    { label: '下载', href: '/download' },
  ],
  console: '进入控制台',
  signIn: '登录',
  signUp: '创建账号',
};

type HeaderProps = {
  locale?: Locale;
  brand?: Dictionary['brand'];
  nav?: Dictionary['nav'];
  /** 对侧语言的 href；仅双语页传，传了才渲染语言切换。 */
  altHref?: string;
};

/**
 * 营销页顶部导航保持纯 SSR。登录态交给 `/dashboard` 自己处理，避免首页首屏提前加载 auth client。
 */
export function Header({ locale = 'zh', brand = DEFAULT_BRAND, nav = DEFAULT_NAV, altHref }: HeaderProps = {}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-cream/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 md:gap-4 md:px-8">
        <a
          href={localizedHref(locale, '/')}
          className="flex min-w-0 items-center gap-2 text-ink no-underline md:gap-2.5"
        >
          <CorgiMascot className="h-8 w-8" priority />
          <span className="shrink-0 whitespace-nowrap text-[16px] font-bold md:text-[18px]">{brand.name}</span>
          <span className="hidden font-mono text-[12px] font-semibold uppercase tracking-wider text-mute sm:inline">
            {brand.by}
          </span>
        </a>
        <nav className="flex items-center gap-1 text-sm text-ink-soft">
          {nav.links.map((link) => (
            <a
              key={link.href}
              href={localizedHref(locale, link.href)}
              className="hidden rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink sm:inline-block"
            >
              {link.label}
            </a>
          ))}
          {altHref ? <LangSwitch locale={locale} altHref={altHref} /> : null}
          <a
            href={localizedHref(locale, '/sign-in')}
            className="hidden rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink sm:inline-block"
          >
            {nav.signIn}
          </a>
          <a
            href={localizedHref(locale, '/dashboard')}
            className="press ml-1 inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-yellow px-3 py-1.5 font-semibold whitespace-nowrap text-ink md:px-3.5"
          >
            {nav.console}
            <ArrowUpRight />
          </a>
        </nav>
      </div>
    </header>
  );
}
