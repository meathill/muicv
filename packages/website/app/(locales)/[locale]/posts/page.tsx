import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONTENT_LOCALES, type ContentLocale } from '@muicv/shared';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { BLOG_STRINGS, blogUrlPrefix } from '@/app/(zh)/(marketing)/_i18n/blog';
import { BlogShell } from '@/app/(zh)/(marketing)/_content/blog-shell';
import { PostsLayout } from '@/app/(zh)/(marketing)/_content/posts-layout';

export const revalidate = 3600;

type Params = { locale: string };

function isLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const strings = BLOG_STRINGS[locale];
  const prefix = blogUrlPrefix(locale);
  return {
    title: strings.allTitle,
    description: strings.allDescription,
    alternates: {
      canonical: `${prefix}/posts`,
      languages: Object.fromEntries(CONTENT_LOCALES.map((l) => [l, `${blogUrlPrefix(l)}/posts`])),
    },
  };
}

export async function generateStaticParams() {
  // zh-CN 由 (zh) 静态子树承接、en 由 /en 承接，这里只预渲染其余语言。
  return CONTENT_LOCALES.filter((locale) => locale !== 'zh-CN').map((locale) => ({ locale }));
}

export default async function LocalePostsIndexPage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const posts = await getWebsitePublishedPosts(locale);

  return (
    <BlogShell locale={locale}>
      <PostsLayout locale={locale} active="all" allPosts={posts} />
    </BlogShell>
  );
}
