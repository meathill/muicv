import type { Metadata } from 'next';
import Link from 'next/link';
import { POST_SECTION_META } from '@muicv/shared';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { ContentCard } from '../_content/content-card';
import { MarketingShell } from '../_content/marketing-shell';
import { ArrowUpRight, Highlight } from '../_icons';
import { soloPageMetadata } from '../_page-meta';

export const metadata: Metadata = soloPageMetadata({
  path: '/posts',
  title: '求职内容中心',
  description: '围绕简历、校招、面试、offer 和 AI agent 的求职文章。',
});

export const revalidate = 3600;

export default async function PostsIndexPage() {
  const posts = await getWebsitePublishedPosts();
  const sectionCounts = new Map<keyof typeof POST_SECTION_META, number>();
  for (const post of posts) {
    sectionCounts.set(post.section, (sectionCounts.get(post.section) ?? 0) + 1);
  }
  const jobsPosts = posts.filter((post) => post.section === 'jobs');

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">Posts</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            把求职里的关键问题，拆成能执行的 <Highlight>文章</Highlight>。
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">
            这里放求职博文、产品教程和后续专题。第一条主线是 /posts/jobs：校招、社招、简历、面试和 offer。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/posts/jobs"
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[15px] font-bold text-ink"
            >
              看求职博文
              <ArrowUpRight />
            </Link>
            <Link
              href="/skills"
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[15px] font-bold text-ink"
            >
              Skill 目录
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-rule bg-paper/45">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-12 md:grid-cols-3 md:px-8">
          {(Object.keys(POST_SECTION_META) as Array<keyof typeof POST_SECTION_META>).map((section) => {
            const meta = POST_SECTION_META[section];
            const count = sectionCounts.get(section) ?? 0;
            return (
              <Link
                key={section}
                href={meta.path}
                className="rounded-xl border-2 border-rule bg-cream p-5 hover:border-ink"
              >
                <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">
                  {count} 篇
                </p>
                <h2 className="mt-2 text-[18px] font-extrabold text-ink">{meta.label}</h2>
                <p className="mt-2 text-[13px] leading-[1.7] text-ink-soft">{meta.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">最新文章</p>
            <h2 className="mt-2 text-[28px] font-extrabold text-ink">先从求职主线开始</h2>
          </div>
          <Link href="/posts/jobs" className="text-[14px] font-bold text-yellow-deep hover:text-ink">
            全部求职文章 →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(jobsPosts.length > 0 ? jobsPosts : posts).map((post) => (
            <ContentCard
              key={`${post.section}/${post.slug}`}
              href={`/posts/${post.section}/${post.slug}`}
              eyebrow={POST_SECTION_META[post.section].label}
              title={post.title}
              summary={post.summary}
              tags={post.tags}
            />
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
