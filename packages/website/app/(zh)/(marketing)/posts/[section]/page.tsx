import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { ContentCard } from '../../_content/content-card';
import { MarketingShell } from '../../_content/marketing-shell';
import { Highlight } from '../../_icons';
import { soloPageMetadata } from '../../_page-meta';

export const revalidate = 3600;

type Params = { section: string };

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) return {};
  const meta = POST_SECTION_META[resolvedParams.section];
  return soloPageMetadata({ path: meta.path, title: meta.label, description: meta.description });
}

export default async function PostSectionPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) notFound();

  const meta = POST_SECTION_META[resolvedParams.section];
  const posts = await getWebsitePublishedPosts(resolvedParams.section);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">{resolvedParams.section}</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            {meta.label}：把问题写成能用的 <Highlight>方法</Highlight>。
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">{meta.description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        {posts.length === 0 ? (
          <div className="rounded-xl border-2 border-rule bg-paper p-8 text-[14px] text-ink-soft">
            这个频道还在整理内容。先去 Skill 目录看看已经登记的求职工具。
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post) => (
              <ContentCard
                key={post.slug}
                href={`/posts/${post.section}/${post.slug}`}
                eyebrow={meta.label}
                title={post.title}
                summary={post.summary}
                tags={post.tags}
              />
            ))}
          </div>
        )}
      </section>
    </MarketingShell>
  );
}
