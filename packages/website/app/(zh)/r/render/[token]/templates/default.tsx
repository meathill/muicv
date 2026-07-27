import type { ParsedResume } from '@/lib/render/parse-resume';

import styles from './default.module.css';

export default function DefaultTemplate({ resume }: { resume: ParsedResume }) {
  return (
    <>
      {/* React 19 自动把 <link> hoist 到 <head>，
          这里加载 Google Fonts 的 Noto Sans SC，避免依赖 next/font 的 CJK 子集自托管。 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap"
      />
      <article className={styles.page} dangerouslySetInnerHTML={{ __html: resume.contentHtml }} />
    </>
  );
}
