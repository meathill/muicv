import type { Metadata } from 'next';
import { getWebsitePublishedChangelog } from '@/lib/cms-content';

import { MarketingShell } from '../_content/marketing-shell';
import { MarkdownBody } from '../_content/markdown';
import { Highlight } from '../_icons';
import { soloPageMetadata } from '../_page-meta';

export const metadata: Metadata = soloPageMetadata({
  path: '/changelog',
  title: '更新日志',
  description: 'Mui 简历产品、skill、app 和网站内容中心的更新记录。',
});

export const revalidate = 3600;

export default async function ChangelogPage() {
  const items = await getWebsitePublishedChangelog();

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">Changelog</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            每次更新，都尽量离拿到 <Highlight>offer</Highlight> 更近一点。
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">
            产品能力、skill 目录、求职内容和桌面 app 的变化都会记录在这里。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-14">
        <div className="space-y-6">
          {items.map((item) => (
            <article
              key={item.slug}
              className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]"
            >
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
                {item.version ? `${item.version} · ` : ''}
                {item.publishedAt}
              </p>
              <h2 className="mt-2 text-[24px] font-extrabold text-ink">{item.title}</h2>
              <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">{item.summary}</p>
              <div className="mt-5 border-t border-rule pt-5">
                <MarkdownBody markdown={item.bodyMarkdown} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
