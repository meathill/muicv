import { type ContentPost, POST_SECTION_META } from '@muicv/shared';
import Link from 'next/link';

import { type Locale, localizedHref } from '../_i18n/locale';
import type { Dictionary } from '../_i18n/types';
import { zh } from '../_i18n/zh';
import { ArrowUpRight, Highlight } from '../_icons';
import { FAQ_ITEMS } from './faq-items';

type FaqAndArticlesProps = {
  recentPosts: ContentPost[];
  dict?: Dictionary;
  locale?: Locale;
};

export function FaqAndArticles({ recentPosts, dict = zh, locale = 'zh' }: FaqAndArticlesProps) {
  const t = dict.faq;
  const items = FAQ_ITEMS[locale];
  return (
    <section className="border-b border-rule">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {t.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight">
            {t.titleA}
            <Highlight>{t.titleHighlight}</Highlight>
            {t.titleEnd}
          </h2>

          <div className="mt-10 space-y-3">
            {items.map((item, idx) => (
              <details
                key={item.q}
                className="group rounded-lg border-2 border-rule-strong bg-cream transition-colors hover:border-corgi"
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

        <aside className="space-y-6 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-cream p-6 shadow-press-ink">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-corgi/30 blur-2xl" aria-hidden />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
                    — {t.articlesEyebrow}
                  </p>
                  <h3 className="mt-3 text-[24px] font-extrabold leading-tight text-ink">{t.articlesTitle}</h3>
                </div>
              </div>
              <p className="mt-3 text-[14px] leading-[1.7] text-ink-soft">{t.articlesLede}</p>

              {recentPosts.length > 0 ? (
                <div className="mt-5 divide-y divide-rule">
                  {recentPosts.map((post) => (
                    <ArticleListItem key={`${post.section}/${post.slug}`} post={post} />
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-rule bg-paper/60 p-4 text-[14px] leading-[1.7] text-ink-soft">
                  {t.articlesEmpty}
                </div>
              )}

              <Link
                href={localizedHref(locale, '/posts')}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)] transition-transform hover:-translate-y-0.5"
              >
                {t.articlesCta}
                <ArrowUpRight />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ArticleListItem({ post }: { post: ContentPost }) {
  return (
    <Link
      href={`/posts/${post.section}/${post.slug}`}
      className="group block py-4 outline-none transition-colors first:pt-0 last:pb-0 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-yellow"
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-mute">
        <span>{formatPostDate(post.publishedAt)}</span>
        <span aria-hidden>·</span>
        <span>{POST_SECTION_META[post.section].label}</span>
      </div>
      <p className="mt-2 text-[16px] font-extrabold leading-snug text-ink transition-colors group-hover:text-yellow-deep">
        {post.title}
      </p>
      <p className="mt-1 text-[14px] leading-[1.6] text-ink-soft">{compactSummary(post.summary)}</p>
      {post.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-fluff px-2 py-1 text-[12px] font-bold text-yellow-deep">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

function formatPostDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${month}.${day}`;
}

function compactSummary(value: string) {
  return value.length > 64 ? `${value.slice(0, 64)}…` : value;
}
