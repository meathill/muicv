import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { Highlight } from '../_icons';

export function Workflow({ dict = zh }: { dict?: Dictionary } = {}) {
  const t = dict.workflow;
  return (
    <section id="workflow" className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-24">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {t.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight">
              {t.titleA}
              <br className="md:hidden" />
              <Highlight>{t.titleHighlight}</Highlight>
              {t.titleEnd}
            </h2>
          </div>
          <p className="hidden max-w-xs text-[14px] leading-[1.65] text-ink-soft md:block">{t.aside}</p>
        </div>

        <ol className="mt-12 space-y-3">
          {t.steps.map((step, idx) => (
            <li
              key={step.title}
              className="group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-1 rounded-xl border-2 border-rule bg-cream px-4 py-4 transition-all hover:border-corgi hover:bg-fluff hover:translate-x-1 sm:gap-x-6 sm:px-5"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow text-sm font-extrabold text-ink tabular-nums shadow-[0_2px_0_0_var(--color-yellow-shadow)] sm:h-11 sm:w-11 sm:text-base">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="max-w-3xl text-[16px] leading-[1.65] text-ink-soft">
                <span className="font-bold text-ink">{step.title}</span>
                <span className="mx-2 text-rule-strong">·</span>
                {step.desc}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
