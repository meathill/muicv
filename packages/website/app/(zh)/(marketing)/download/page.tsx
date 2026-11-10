import type { Metadata } from 'next';
import { getDictionary } from '../_i18n/dict';
import { pageMetadata } from '../_page-meta';
import { DownloadView } from './_view';

// Header 客户端读 session 之后页面可走 ISR。GitHub fetch 内部 revalidate 300 决定数据新鲜度，
// 这里再加一层页面级 revalidate 让 OpenNext R2 兜底 HTML 缓存。
export const revalidate = 300;

const dict = getDictionary('zh');
const { title, description } = dict.meta.download;

export const metadata: Metadata = pageMetadata({
  locale: 'zh',
  path: '/download',
  // 纯串 title，走 root 的 '%s · Mui简历' 模板 → 品牌后缀。
  title,
  description,
});

export default function DownloadPage() {
  return <DownloadView locale="zh" />;
}
