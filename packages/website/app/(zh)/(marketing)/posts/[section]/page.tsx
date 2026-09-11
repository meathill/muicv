import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

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
  return soloPageMetadata({ path: meta.path, title: meta.label, description: meta.description });
}

export default async function PostSectionPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  if (!isPostSection(resolvedParams.section)) notFound();

  // 取全量用于侧边栏计数，当前分类的过滤在 PostsLayout 内完成。
  const posts = await getWebsitePublishedPosts();

  return (
    <MarketingShell>
      <PostsLayout active={resolvedParams.section} allPosts={posts} />
    </MarketingShell>
  );
}
