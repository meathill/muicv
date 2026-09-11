import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PostSection } from '@muicv/shared';
import { getPostAlternateLanguages, getWebsitePostBySlug, getWebsitePublishedPosts } from '@/lib/cms-content';

import { MarketingShell } from '../../../_content/marketing-shell';
import { PostDetailView } from '../../../_content/post-detail-view';

export const revalidate = 3600;

type Params = { section: string; slug: string };

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) return {};
  const post = await getWebsitePostBySlug('zh-CN', resolvedParams.section, resolvedParams.slug);
  if (!post) return {};
  const languages = await getPostAlternateLanguages(post.section, post.slug);
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    keywords: post.keywords,
    alternates: { canonical: `/posts/${post.section}/${post.slug}`, languages },
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
  const posts = await getWebsitePublishedPosts('zh-CN');
  return posts.map((post) => ({ section: post.section, slug: post.slug }));
}

export default async function PostDetailPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) notFound();
  const post = await getWebsitePostBySlug('zh-CN', resolvedParams.section, resolvedParams.slug);
  if (!post) notFound();

  return (
    <MarketingShell>
      <PostDetailView locale="zh-CN" post={post} />
    </MarketingShell>
  );
}
