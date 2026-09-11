import { CorgiMascot } from '@/components/corgi-mascot';

import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { HeaderAuth } from './header-auth';

// zh 默认内联在此（本就是 header 原有的硬编码数据），避免把整个词典 bundle 进客户端。
// 英文页通过 props 覆盖 brand/nav。
const DEFAULT_BRAND: Dictionary['brand'] = { name: 'Mui简历', by: 'by Mui 🐾' };
const DEFAULT_NAV: Dictionary['nav'] = {
  links: [
    { label: '模板', href: '/templates' },
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
  locale?: Locale | undefined;
  brand?: Dictionary['brand'] | undefined;
  nav?: Dictionary['nav'] | undefined;
};

/**
 * 营销页顶部导航保持纯 SSR。导航链接靠左紧跟 Logo，登录态操作抽为客户端小岛 HeaderAuth。
 */
export function Header({ locale = 'zh', brand = DEFAULT_BRAND, nav = DEFAULT_NAV }: HeaderProps = {}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-cream/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-6 md:gap-8">
          <a
            href={localizedHref(locale, '/')}
            className="flex shrink-0 items-center gap-2 text-ink no-underline md:gap-2.5"
          >
            <CorgiMascot className="h-8 w-8" />
            <span className="shrink-0 whitespace-nowrap text-[16px] font-bold md:text-[18px]">{brand.name}</span>
            <span className="hidden font-mono text-[12px] font-semibold uppercase tracking-wider text-mute sm:inline">
              {brand.by}
            </span>
          </a>
          <nav className="hidden items-center gap-1 text-sm text-ink-soft sm:flex">
            {nav.links.map((link) => (
              <a
                key={link.href}
                href={localizedHref(locale, link.href)}
                className="rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-ink-soft">
          <HeaderAuth locale={locale} nav={nav} />
        </div>
      </div>
    </header>
  );
}
