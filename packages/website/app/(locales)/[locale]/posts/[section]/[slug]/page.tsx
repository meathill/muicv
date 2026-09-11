import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONTENT_LOCALES, type ContentLocale, type PostSection } from '@muicv/shared';
import { getPostAlternateLanguages, getWebsitePostBySlug, getWebsitePublishedPosts } from '@/lib/cms-content';

import { BLOG_STRINGS, blogUrlPrefix } from '@/app/(zh)/(marketing)/_i18n/blog';
import { BlogShell } from '@/app/(zh)/(marketing)/_content/blog-shell';
import { PostDetailView } from '@/app/(zh)/(marketing)/_content/post-detail-view';

export const revalidate = 3600;

type Params = { locale: string; section: string; slug: string };

function isLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, section, slug } = await params;
  if (!isLocale(locale) || !isPostSection(section)) return {};
  const post = await getWebsitePostBySlug(locale, section, slug);
  if (!post) return {};
  const prefix = blogUrlPrefix(locale);
  // 只链到确实有译文的语言，避免 hreflang 指向 404。
  const languages = await getPostAlternateLanguages(post.section, post.slug);
  return {
    title: post.seoTitle,
    description: post.seoDescription,
    keywords: post.keywords,
    alternates: {
      canonical: `${prefix}/posts/${post.section}/${post.slug}`,
      languages,
    },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `${prefix}/posts/${post.section}/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      locale,
    },
  };
}

export async function generateStaticParams() {
  const params: Array<{ locale: string; section: PostSection; slug: string }> = [];
  for (const locale of CONTENT_LOCALES) {
    if (locale === 'zh-CN') continue;
    const posts = await getWebsitePublishedPosts(locale);
    for (const post of posts) {
      params.push({ locale, section: post.section, slug: post.slug });
    }
  }
  return params;
}

export default async function LocalePostDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, section, slug } = await params;
  if (!isLocale(locale) || !isPostSection(section)) notFound();
  const post = await getWebsitePostBySlug(locale, section, slug);
  if (!post) notFound();

  return (
    <BlogShell locale={locale}>
      <PostDetailView locale={locale} post={post} />
    </BlogShell>
  );
}
