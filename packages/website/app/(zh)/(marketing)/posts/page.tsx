import type { Metadata } from 'next';
import { getListAlternateLanguages, getWebsitePublishedPosts } from '@/lib/cms-content';

import { MarketingShell } from '../_content/marketing-shell';
import { PostsLayout } from '../_content/posts-layout';
import { soloPageMetadata } from '../_page-meta';

// 文章列表已有 9 语言版本，覆盖 soloPageMetadata 的 canonical-only alternates，补 hreflang。
const baseMetadata = soloPageMetadata({
  path: '/posts',
  title: '求职内容中心：简历、校招、面试与 offer 实战文章',
  description:
    '围绕简历、校招、面试、offer 和 AI agent 的求职文章。涵盖程序员简历优化、ATS 关键词、模拟面试、岗位匹配与求职决策，帮助你逐步拿 offer。',
});

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: { canonical: '/posts', languages: getListAlternateLanguages() },
};

export const revalidate = 3600;

export default async function PostsIndexPage() {
  const posts = await getWebsitePublishedPosts('zh-CN');

  return (
    <MarketingShell>
      <PostsLayout locale="zh-CN" active="all" allPosts={posts} />
    </MarketingShell>
  );
}
