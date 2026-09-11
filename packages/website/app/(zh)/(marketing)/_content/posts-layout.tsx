import type { ContentLocale, ContentPost } from '@muicv/shared';

import { BLOG_STRINGS, blogUrlPrefix } from '../_i18n/blog';
import { ContentCard } from './content-card';
import { countPostsBySection, type PostCategory, PostCategoryNav } from './post-category-nav';

/**
 * 文章列表两栏外壳：左侧分类侧边栏 + 右侧文章列表，供中文 /posts 与多语言 /<locale>/posts 共用。
 * 传入全量文章与 locale，内部算各分类计数、当前分类可见列表，并生成本语言的链接与文案。
 */
export function PostsLayout({
  locale,
  active,
  allPosts,
}: {
  locale: ContentLocale;
  active: PostCategory;
  allPosts: ContentPost[];
}) {
  const strings = BLOG_STRINGS[locale];
  const prefix = blogUrlPrefix(locale);
  const counts = countPostsBySection(allPosts);
  const visible = active === 'all' ? allPosts : allPosts.filter((post) => post.section === active);
  const heading =
    active === 'all'
      ? { eyebrow: strings.eyebrow, title: strings.allTitle, description: strings.allDescription }
      : {
          eyebrow: strings.eyebrow,
          title: strings.sections[active],
          description: strings.sectionDescs[active],
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
          <PostCategoryNav
            active={active}
            counts={counts}
            total={allPosts.length}
            strings={strings}
            hrefFor={(category) => (category === 'all' ? `${prefix}/posts` : `${prefix}/posts/${category}`)}
          />
        </aside>

        <div className="mt-8 lg:mt-0">
          <p className="text-[13px] text-mute">{strings.totalLabel(visible.length)}</p>
          {visible.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-rule bg-paper p-8 text-[14px] text-ink-soft">
              {active === 'all' ? strings.emptyAll : strings.emptySection}
            </div>
          ) : (
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {visible.map((post) => (
                <ContentCard
                  key={`${post.locale}/${post.section}/${post.slug}`}
                  href={`${prefix}/posts/${post.section}/${post.slug}`}
                  eyebrow={strings.sections[post.section]}
                  title={post.title}
                  summary={post.summary}
                  tags={post.tags}
                  ctaLabel={strings.readMore}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
