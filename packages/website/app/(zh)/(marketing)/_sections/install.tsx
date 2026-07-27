import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { Highlight } from '../_icons';
import { InstallCard } from '../_install-card';

export function Install({ dict = zh, locale = 'zh' }: { dict?: Dictionary; locale?: Locale } = {}) {
  const t = dict.install;
  return (
    <section id="install" className="relative overflow-hidden border-b border-rule">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 0%, color-mix(in srgb, var(--color-corgi) 65%, transparent) 0%, color-mix(in srgb, var(--color-fluff) 50%, transparent) 35%, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-cream px-3.5 py-1 text-[12px] font-bold text-ink">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-deep" />
              {t.badge}
            </span>
            <h2 className="mt-5 text-[clamp(1.9rem,3.5vw,2.75rem)] font-extrabold leading-[1.1] tracking-tight">
              {t.titleA}
              <br />
              <Highlight>{t.titleHighlight}</Highlight>
              {t.titleEnd}
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-[1.7] text-ink-soft">{t.lede}</p>
            <p className="mt-4 max-w-md text-[14px] leading-[1.7] text-mute">
              {t.noteBefore}
              <a
                href={localizedHref(locale, '/download')}
                className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
              >
                {t.noteLink}
              </a>
              {t.noteAfter}
            </p>
          </div>

          <div className="grid gap-4 lg:col-span-7">
            <InstallCard title="npx skills" meta={t.cardMeta} code={`npx skills add meathill/muicv -g`} />
          </div>
        </div>
      </div>
    </section>
  );
}
