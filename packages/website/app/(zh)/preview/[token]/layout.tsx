import styles from './preview.module.css';

/**
 * 预览页 shell。robots / og 等 metadata 不在这里设，由 page.tsx 的 generateMetadata
 * 根据该 preview 的 shareMode 决定（'public' → 索引，'link' → noindex）。
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
