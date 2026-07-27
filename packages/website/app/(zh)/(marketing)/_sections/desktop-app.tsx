import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { ArrowUpRight, Highlight } from '../_icons';

export function DesktopApp({ dict = zh, locale = 'zh' }: { dict?: Dictionary; locale?: Locale } = {}) {
  const t = dict.desktopApp;
  const downloadHref = localizedHref(locale, '/download');
  return (
    <section id="desktop-app" className="relative overflow-hidden border-b border-rule">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 100%, color-mix(in srgb, var(--color-corgi) 55%, transparent) 0%, color-mix(in srgb, var(--color-fluff) 45%, transparent) 40%, transparent 78%)',
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-yellow px-3.5 py-1 text-[12px] font-bold text-ink">
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
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href={downloadHref}
                className="press inline-flex items-center gap-2 rounded-md border-2 border-ink bg-yellow px-5 py-3 text-[16px] font-bold text-ink"
              >
                {t.ctaDownload}
                <ArrowUpRight />
              </a>
              <a
                href="#install"
                className="text-[14px] font-semibold text-ink-soft underline decoration-rule decoration-2 underline-offset-4 transition hover:text-ink hover:decoration-yellow"
              >
                {t.ctaAdvanced}
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-3">
              {t.platforms.map((p) => (
                <a
                  key={p.name}
                  href={downloadHref}
                  className="press-ink group block rounded-xl border-2 border-ink bg-cream p-5 shadow-press-ink transition-transform hover:-translate-y-0.5"
                >
                  <p className="text-[16px] font-extrabold text-ink">{p.name}</p>
                  <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-mute">{p.sub}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-yellow-deep">
                    {t.downloadLabel}
                    <ArrowUpRight />
                  </span>
                </a>
              ))}
            </div>
            <p className="mt-5 text-[12px] leading-[1.7] text-mute">
              {t.noteBefore}
              <a
                href={downloadHref}
                className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
              >
                {t.noteLink}
              </a>
              {t.noteAfter}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
