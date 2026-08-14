import { getDictionary, type Locale } from '../_i18n/dict';
import { Highlight } from '../_icons';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';
import { getPricingContent } from './_content';
import { PricingClient } from './_pricing-client';

/**
 * 定价页静态壳。
 *
 * 页面在构建期预渲染（ISR），不读 session / 币种 / 订阅；登录态、订阅状态、
 * 币种切换、CN 包 cooldown 全部由 <PricingClient> 在客户端补齐。
 */
export function PricingView({ locale }: { locale: Locale }) {
  const c = getPricingContent(locale);
  const dict = getDictionary(locale);
  const altHref = locale === 'zh' ? '/en/pricing' : '/pricing';

  return (
    <div className="relative">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.heroEyebrow}</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              {c.heroTitleLead}
              <Highlight>{c.heroTitleHighlight}</Highlight>
              {c.heroTitleMid}
              <br />
              {c.heroTitleTail}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.7] text-ink-soft">{c.heroLede}</p>
          </div>
        </div>
      </section>

      <PricingClient locale={locale} />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.faqEyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.faqTitle}
          </h2>
          <div className="mt-10 space-y-3">
            {c.faq.map((item, idx) => (
              <details
                key={item.q}
                className="group rounded-xl border-2 border-rule bg-cream transition-colors hover:border-corgi"
                open={idx === 0}
              >
                <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 inline-flex h-7 shrink-0 items-center rounded-md bg-fluff px-2 font-mono text-[12px] font-bold tabular-nums text-yellow-deep">
                    Q{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[16px] font-bold leading-snug text-ink">{item.q}</span>
                  <span
                    className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fluff text-yellow-deep transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-rule px-5 pb-5 pt-4 pl-[4.5rem] text-[16px] leading-[1.7] text-ink-soft">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer dict={dict} locale={locale} />
    </div>
  );
}
