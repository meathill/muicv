import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import { getWebsitePostBySlug } from '@/lib/cms-content';

import { OG_SIZE, renderPostOgImage } from '../../../_content/post-og';

/**
 * 中文文章定制 OG 卡：标题 + 板块 + 作者/日期 + 品牌。
 * 渲染逻辑在 _content/post-og.tsx，多语言路由复用同一套。
 */

export const alt = 'Mui简历 文章分享';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

type Params = { section: string; slug: string };

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { section, slug } = await params;
  if (!isPostSection(section)) return renderPostOgImage(fallbackArgs());
  const post = await getWebsitePostBySlug('zh-CN', section, slug);
  if (!post) return renderPostOgImage(fallbackArgs());

  return renderPostOgImage({
    post,
    sectionLabel: POST_SECTION_META[post.section].label,
    brandName: 'Mui简历',
    shareLabel: '文章分享',
    fontFamily: 'Noto+Sans+SC',
  });
}

/** 取不到文章时仍需返回一张合法图片，避免 OG 抓取 404。 */
function fallbackArgs() {
  return {
    post: { title: 'Mui简历', author: 'Mui简历', publishedAt: new Date().toISOString() },
    sectionLabel: '文章',
    brandName: 'Mui简历',
    shareLabel: '文章分享',
    fontFamily: 'Noto+Sans+SC',
  };
}
