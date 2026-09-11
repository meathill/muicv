import Link from 'next/link';
import { POST_SECTION_META, type ContentPost, type PostSection } from '@muicv/shared';

/** 文章分类筛选项：`all` 为「全部」，其余与 post section 一一对应。 */
export type PostCategory = 'all' | PostSection;

/** 按 section 统计文章数，供侧边栏显示计数。 */
export function countPostsBySection(posts: ContentPost[]): Record<PostSection, number> {
  const counts: Record<PostSection, number> = { jobs: 0, product: 0, guide: 0 };
  for (const post of posts) counts[post.section] += 1;
  return counts;
}

/**
 * 文章分类侧边栏。「全部」指向 /posts，其余指向各 section 列表页，
 * 当前分类由调用方的路由决定并通过 active 传入（server component 无需 usePathname）。
 */
export function PostCategoryNav({
  active,
  counts,
  total,
}: {
  active: PostCategory;
  counts: Record<PostSection, number>;
  total: number;
}) {
  const items: Array<{ key: PostCategory; label: string; href: string; count: number }> = [
    { key: 'all', label: '全部', href: '/posts', count: total },
    ...(Object.keys(POST_SECTION_META) as PostSection[]).map((section) => ({
      key: section,
      label: POST_SECTION_META[section].label,
      href: POST_SECTION_META[section].path,
      count: counts[section],
    })),
  ];

  return (
    <nav aria-label="文章分类">
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">分类</p>
      <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                prefetch={false}
                aria-current={isActive ? 'page' : undefined}
                className={
                  isActive
                    ? 'flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-yellow px-3 py-2 text-[14px] font-bold text-ink'
                    : 'flex items-center justify-between gap-3 rounded-md border-2 border-transparent px-3 py-2 text-[14px] text-ink-soft hover:border-rule hover:bg-paper hover:text-ink'
                }
              >
                <span>{item.label}</span>
                <span className="font-mono text-[12px] text-mute">{item.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
