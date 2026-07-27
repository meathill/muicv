import { CorgiMascot } from '@/components/corgi-mascot';

import { FooterCol } from '../_footer-col';
import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { PawIcon } from '../_icons';

export function Footer({ dict = zh, locale = 'zh' }: { dict?: Dictionary; locale?: Locale } = {}) {
  const t = dict.footer;
  return (
    <footer className="bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <a href={localizedHref(locale, '/')} className="flex items-center gap-2.5 text-ink no-underline">
            <CorgiMascot className="h-9 w-9" />
            <span className="text-[18px] font-bold tracking-tight">{dict.brand.name}</span>
          </a>
          <p className="mt-4 max-w-xs text-[14px] leading-[1.65] text-ink-soft">{t.tagline}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-yellow-deep">
            <PawIcon className="h-3.5 w-3.5" />
            {t.curatedBy}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-[14px] sm:grid-cols-4 lg:col-span-7">
          {t.cols.map((col) => (
            <FooterCol
              key={col.label}
              label={col.label}
              links={col.links.map((link) => [link.label, localizedHref(locale, link.href)] as [string, string])}
            />
          ))}
        </div>
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[12px] text-mute md:flex-row md:items-center md:justify-between md:px-8">
          <span>{t.copyright}</span>
          <span className="font-mono text-[12px] uppercase tracking-wider">{t.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
