import type { Metadata } from 'next';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { MarketingShell } from '../_content/marketing-shell';
import { PostsLayout } from '../_content/posts-layout';
import { soloPageMetadata } from '../_page-meta';

export const metadata: Metadata = soloPageMetadata({
  path: '/posts',
  title: '求职内容中心',
  description: '围绕简历、校招、面试、offer 和 AI agent 的求职文章。',
});

export const revalidate = 3600;

export default async function PostsIndexPage() {
  const posts = await getWebsitePublishedPosts();

  return (
    <MarketingShell>
      <PostsLayout active="all" allPosts={posts} />
    </MarketingShell>
  );
}
