import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getListAlternateLanguages, getWebsitePublishedPosts } from '@/lib/cms-content';

import { MarketingShell } from '../../_content/marketing-shell';
import { PostsLayout } from '../../_content/posts-layout';
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
  const base = soloPageMetadata({ path: meta.path, title: meta.label, description: meta.description });
  return {
    ...base,
    alternates: { canonical: meta.path, languages: getListAlternateLanguages(resolvedParams.section) },
  };
}

export default async function PostSectionPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) notFound();

  // 取全量用于侧边栏计数，当前分类的过滤在 PostsLayout 内完成。
  const posts = await getWebsitePublishedPosts('zh-CN');

  return (
    <MarketingShell>
      <PostsLayout locale="zh-CN" active={resolvedParams.section} allPosts={posts} />
    </MarketingShell>
  );
}
