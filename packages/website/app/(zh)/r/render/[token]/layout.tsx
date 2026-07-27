import type { Metadata } from 'next';

import styles from './layout.module.css';

/**
 * 简历预览页是给 puppeteer 渲染 PDF 用的内部 URL，
 * 不希望被搜索引擎索引，也不希望从公网泄漏。
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
