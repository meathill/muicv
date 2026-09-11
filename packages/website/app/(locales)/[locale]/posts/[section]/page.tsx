import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CONTENT_LOCALES, type ContentLocale, type PostSection } from '@muicv/shared';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { BLOG_STRINGS, blogUrlPrefix } from '@/app/(zh)/(marketing)/_i18n/blog';
import { BlogShell } from '@/app/(zh)/(marketing)/_content/blog-shell';
import { PostsLayout } from '@/app/(zh)/(marketing)/_content/posts-layout';

export const revalidate = 3600;

type Params = { locale: string; section: string };

function isLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isPostSection(section)) return {};
  const strings = BLOG_STRINGS[locale];
  const prefix = blogUrlPrefix(locale);
  return {
    title: strings.sections[section],
    description: strings.sectionDescs[section],
    alternates: {
      canonical: `${prefix}/posts/${section}`,
      languages: Object.fromEntries(CONTENT_LOCALES.map((l) => [l, `${blogUrlPrefix(l)}/posts/${section}`])),
    },
  };
}

export async function generateStaticParams() {
  const params: Array<{ locale: string; section: PostSection }> = [];
  for (const locale of CONTENT_LOCALES) {
    // zh-CN 由 (zh) 静态子树承接、en 由 /en 承接。
    if (locale === 'zh-CN') continue;
    for (const section of ['jobs', 'product', 'guide'] as const) {
      params.push({ locale, section });
    }
  }
  return params;
}

export default async function LocalePostSectionPage({ params }: { params: Promise<Params> }) {
  const { locale, section } = await params;
  if (!isLocale(locale) || !isPostSection(section)) notFound();

  const posts = await getWebsitePublishedPosts(locale);

  return (
    <BlogShell locale={locale}>
      <PostsLayout locale={locale} active={section} allPosts={posts} />
    </BlogShell>
  );
}
