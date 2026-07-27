import Link from 'next/link';

import { ArrowUpRight } from '../_icons';

export function ContentCard({
  href,
  eyebrow,
  title,
  summary,
  tags,
}: {
  href: string;
  eyebrow: string;
  title: string;
  summary: string;
  tags: string[];
}) {
  return (
    <article className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink-line)] transition-transform hover:-translate-y-1">
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">{eyebrow}</p>
      <h2 className="mt-2 text-[20px] font-extrabold leading-[1.25] text-ink">
        <Link href={href} className="hover:text-yellow-deep">
          {title}
        </Link>
      </h2>
      <p className="mt-3 text-[14px] leading-[1.7] text-ink-soft">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full border border-rule bg-paper px-2.5 py-1 text-[12px] text-mute">
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-yellow-deep hover:text-ink"
      >
        查看详情
        <ArrowUpRight />
      </Link>
    </article>
  );
}
