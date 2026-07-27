import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import { JsonLd } from '@/components/json-ld';
import { getWebsitePostBySlug, getWebsitePublishedPosts } from '@/lib/cms-content';

import { MarketingShell } from '../../../_content/marketing-shell';
import { MarkdownBody } from '../../../_content/markdown';
import { ArrowUpRight } from '../../../_icons';

const SITE_URL = 'https://muicv.com';

export const revalidate = 3600;

type Params = { section: string; slug: string };

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) return {};
  const post = await getWebsitePostBySlug(resolvedParams.section, resolvedParams.slug);
  if (!post) return {};
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    keywords: post.keywords,
    alternates: { canonical: `/posts/${post.section}/${post.slug}` },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `/posts/${post.section}/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export async function generateStaticParams() {
  const posts = await getWebsitePublishedPosts();
  return posts.map((post) => ({ section: post.section, slug: post.slug }));
}

export default async function PostDetailPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) notFound();
  const post = await getWebsitePostBySlug(resolvedParams.section, resolvedParams.slug);
  if (!post) notFound();

  const sectionMeta = POST_SECTION_META[post.section];
  const postUrl = `${SITE_URL}/posts/${post.section}/${post.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'Mui简历',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/mui-logo.png` },
    },
    keywords: post.keywords,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '文章', item: `${SITE_URL}/posts` },
      { '@type': 'ListItem', position: 3, name: sectionMeta.label, item: `${SITE_URL}${sectionMeta.path}` },
      { '@type': 'ListItem', position: 4, name: post.title, item: postUrl },
    ],
  };

  return (
    <MarketingShell>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <article>
        <header className="border-b border-rule bg-paper/55">
          <div className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-16">
            <Link href={sectionMeta.path} className="text-[13px] font-bold text-yellow-deep hover:text-ink">
              ← {sectionMeta.label}
            </Link>
            <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
              {post.publishedAt} · {post.author}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.8vw,3.5rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
              {post.title}
            </h1>
            <p className="mt-5 text-[17px] leading-[1.75] text-ink-soft">{post.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-rule bg-cream px-3 py-1 text-[12px] text-mute">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-14">
          <MarkdownBody markdown={post.bodyMarkdown} />
          <div className="mt-12 rounded-xl border-2 border-ink bg-yellow p-6 text-on-yellow shadow-[0_4px_0_0_var(--color-yellow-shadow)]">
            <h2 className="text-[20px] font-extrabold">继续把素材整理好</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-on-yellow-soft">
              文章只能给方向，真正投递前还是要回到你的经历、项目和目标岗位。Mui app 会把这些材料放在同一个本地素材库里。
            </p>
            <Link
              href="/download"
              className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-extrabold text-on-yellow"
            >
              下载桌面 app
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}
