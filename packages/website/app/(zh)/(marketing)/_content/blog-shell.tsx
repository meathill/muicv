import Link from 'next/link';
import type { ContentLocale } from '@muicv/shared';
import { CorgiMascot } from '@/components/corgi-mascot';

import { BLOG_STRINGS, blogUrlPrefix, marketingHref } from '../_i18n/blog';

/**
 * 博客专用外壳（header + footer）。
 *
 * 与 MarketingShell 分开的原因：MarketingShell 依赖整站营销词典（hero/features/faq…），
 * 目前只有 zh/en 两份；博客是最先本地化的面，用 BLOG_STRINGS 即可撑起任意语言，
 * 不必等整站营销文案翻译完成。整站本地化完成后可合并。
 */
export function BlogShell({ locale, children }: { locale: ContentLocale; children: React.ReactNode }) {
  const strings = BLOG_STRINGS[locale];
  const prefix = blogUrlPrefix(locale);

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-rule bg-cream/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-6 md:gap-8">
            <Link
              href={marketingHref(locale, '/')}
              className="flex shrink-0 items-center gap-2 text-ink no-underline md:gap-2.5"
            >
              <CorgiMascot className="h-8 w-8" />
              <span className="shrink-0 whitespace-nowrap text-[16px] font-bold md:text-[18px]">{strings.brand}</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm text-ink-soft">
              <Link
                href={marketingHref(locale, '/')}
                className="rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink"
              >
                {strings.navHome}
              </Link>
              <Link href={`${prefix}/posts`} className="rounded px-2.5 py-1.5 transition hover:bg-fluff hover:text-ink">
                {strings.navPosts}
              </Link>
            </nav>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-8 text-[12px] text-mute md:px-8">{strings.footerCopyright}</div>
      </footer>
    </div>
  );
}
