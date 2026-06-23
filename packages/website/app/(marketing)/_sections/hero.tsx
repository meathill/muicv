import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { ArrowUpRight, Highlight, PawIcon, Sparkle } from '../_icons';
import { HeroShowcase } from './hero-showcase';

export function Hero({ dict = zh, locale = 'zh' }: { dict?: Dictionary; locale?: Locale } = {}) {
  const t = dict.hero;
  return (
    <section className="relative overflow-hidden border-b border-rule">
      <div className="absolute inset-0 bg-sun" aria-hidden />
      <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />

      <div className="pointer-events-none absolute left-[8%] top-[18%] hidden text-corgi/40 lg:block">
        <PawIcon className="h-7 w-7" />
      </div>
      <div className="pointer-events-none absolute right-[6%] top-[60%] hidden text-corgi/30 lg:block">
        <PawIcon className="h-9 w-9 -rotate-12" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-12 lg:py-28">
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-corgi/60 bg-fluff px-3 py-1 text-[12px] font-semibold text-yellow-deep">
            <Sparkle />
            <span>{t.badge}</span>
          </div>

          <h1 className="mt-7 text-[clamp(2.5rem,7vw,5.25rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            {t.titleA}
            <br />
            <Highlight>{t.titleHighlight}</Highlight>
            {t.titleEnd}
          </h1>

          <p className="mt-7 max-w-xl text-[18px] leading-[1.7] text-ink-soft">{t.lede}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={localizedHref(locale, '/download')}
              className="press inline-flex items-center gap-2 rounded-md border-2 border-ink bg-yellow px-5 py-3 text-[16px] font-bold text-ink"
            >
              {t.ctaDownload}
              <ArrowUpRight />
            </a>
            <a
              href="#workflow"
              className="press-ink inline-flex items-center gap-2 rounded-md border-2 border-ink bg-cream px-5 py-3 text-[16px] font-bold text-ink"
            >
              {t.ctaSteps}
              <ArrowUpRight />
            </a>
            <a
              href={localizedHref(locale, '/sign-up')}
              className="ml-1 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink hover:decoration-yellow"
            >
              {t.accountSignedOut}
            </a>
          </div>

          <p className="mt-10 max-w-lg border-t-2 border-dotted border-rule-strong pt-5 text-[14px] leading-[1.7] text-mute">
            {t.agentNote}
          </p>
        </div>

        <div className="lg:col-span-5">
          <HeroShowcase showcase={dict.heroShowcase} />
        </div>
      </div>
    </section>
  );
}
