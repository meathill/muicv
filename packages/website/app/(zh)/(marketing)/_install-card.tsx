import { Sparkle } from './_icons';

export function InstallCard({
  title,
  meta,
  code,
  preferred,
}: {
  title: string;
  meta: string;
  code: string;
  preferred?: boolean;
}) {
  return (
    <div className="group relative rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink-line)] transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-extrabold text-ink">{title}</h3>
            {preferred && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow px-2.5 py-0.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink">
                <Sparkle />
                推荐
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-mute">{meta}</p>
        </div>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border-2 border-ink/85 bg-[#1a1815] p-4 font-mono text-[12px] leading-relaxed text-[#f3e9d5]/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}
