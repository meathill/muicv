import { POST_SECTION_META, type ContentPost } from '@muicv/shared';

import { ContentCard } from './content-card';
import { PostCategoryNav, countPostsBySection, type PostCategory } from './post-category-nav';

/**
 * 文章列表两栏外壳：左侧分类侧边栏 + 右侧文章列表，供 /posts 与 /posts/[section] 共用。
 * 传入全量文章，内部同时算出各分类计数与当前分类的可见列表，保证计数始终是全站的。
 */
export function PostsLayout({ active, allPosts }: { active: PostCategory; allPosts: ContentPost[] }) {
  const counts = countPostsBySection(allPosts);
  const visible = active === 'all' ? allPosts : allPosts.filter((post) => post.section === active);
  const heading =
    active === 'all'
      ? { eyebrow: 'Posts', title: '全部文章', description: '围绕简历、校招、面试、offer 和 AI agent 的求职文章。' }
      : {
          eyebrow: active,
          title: POST_SECTION_META[active].label,
          description: POST_SECTION_META[active].description,
        };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
      <header className="border-b border-rule pb-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">{heading.eyebrow}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight text-ink">
          {heading.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-[1.7] text-ink-soft">{heading.description}</p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <PostCategoryNav active={active} counts={counts} total={allPosts.length} />
        </aside>

        <div className="mt-8 lg:mt-0">
          <p className="text-[13px] text-mute">共 {visible.length} 篇</p>
          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-rule bg-paper p-8 text-[14px] text-ink-soft">
              {active === 'all'
                ? '文章还在整理中，先去 Skill 目录看看已经登记的求职工具。'
                : '这个分类还在整理内容，先看看其他分类。'}
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {visible.map((post) => (
                <ContentCard
                  key={`${post.section}/${post.slug}`}
                  href={`/posts/${post.section}/${post.slug}`}
                  eyebrow={POST_SECTION_META[post.section].label}
                  title={post.title}
                  summary={post.summary}
                  tags={post.tags}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
