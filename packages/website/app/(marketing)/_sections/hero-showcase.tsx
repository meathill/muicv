import { CorgiMascot } from '@/components/corgi-mascot';

import type { Dictionary } from '../_i18n/types';
import { DocIcon } from '../_icons';

type Showcase = Dictionary['heroShowcase'];

const SLIDE_KEYS = ['import', 'library', 'resume'] as const;

export function HeroShowcase({ showcase }: { showcase: Showcase }) {
  return (
    <div className="relative">
      <div className="absolute -right-3 -top-7 z-10 hidden md:block">
        <CorgiMascot className="h-16 w-16 drop-shadow-[0_3px_0_var(--color-yellow-shadow)]" />
      </div>
      <div className="absolute -inset-x-1 -inset-y-1 rounded-xl bg-yellow/15 blur-md" aria-hidden />

      <div className="relative">
        <div aria-label={showcase.tabsAria} className="mb-3 flex flex-wrap gap-1.5">
          {SLIDE_KEYS.map((key) => {
            const isActive = key === 'import';
            return (
              <span
                key={key}
                className={
                  isActive
                    ? 'rounded-full border-2 border-ink bg-yellow px-3 py-1 text-[12px] font-bold text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)]'
                    : 'rounded-full border-2 border-rule bg-cream px-3 py-1 text-[12px] font-semibold text-ink-soft'
                }
              >
                {showcase.slides[key]}
              </span>
            );
          })}
        </div>

        <div className="relative aspect-[4/3.1] w-full">
          <ImportSlide s={showcase} />
        </div>

        <div className="mt-3 flex items-center gap-2 font-mono text-[12px] text-mute">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow" />
          {showcase.caption}
        </div>
      </div>
    </div>
  );
}

function ImportSlide({ s }: { s: Showcase }) {
  return (
    <div className="relative h-full overflow-hidden rounded-xl border-2 border-ink bg-cream shadow-press-ink-lg">
      <div className="flex items-center justify-between border-b-2 border-rule bg-paper px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-tongue/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-corgi/80" />
        </div>
        <span className="font-mono text-[12px] uppercase tracking-wider text-mute">{s.importHeader}</span>
      </div>
      <div className="p-5">
        <p className="text-[18px] font-extrabold text-ink">{s.importTitle}</p>
        <p className="mt-2 text-[14px] leading-[1.65] text-ink-soft">{s.importDesc}</p>
        <div className="mt-5 grid gap-3">
          {s.importItems.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-xl border-2 border-rule bg-paper/70 px-4 py-3"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-yellow text-ink">
                <DocIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[14px] font-extrabold text-ink">{item.title}</span>
                <span className="block text-[12px] text-mute">{item.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
