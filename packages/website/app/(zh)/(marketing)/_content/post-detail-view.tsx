import Link from 'next/link';
import type { ContentLocale, ContentPost } from '@muicv/shared';
import { JsonLd } from '@/components/json-ld';

import { BLOG_STRINGS, blogUrlPrefix, marketingHref } from '../_i18n/blog';
import { ArrowUpRight } from '../_icons';
import { Breadcrumb } from './breadcrumb';
import { MarkdownBody } from './markdown';

const SITE_URL = 'https://muicv.com';

/** 文章详情正文。中文 /posts/... 与多语言 /<locale>/posts/... 共用，链接与文案按 locale 生成。 */
export function PostDetailView({ locale, post }: { locale: ContentLocale; post: ContentPost }) {
  const strings = BLOG_STRINGS[locale];
  const prefix = blogUrlPrefix(locale);
  const sectionLabel = strings.sections[post.section];
  const postPath = `${prefix}/posts/${post.section}/${post.slug}`;
  const postUrl = `${SITE_URL}${postPath}`;

  // shared 的 POST_SECTION_META.path 是中文站路径，多语言下要换成带前缀的路径。
  const sectionHref = `${prefix}/posts/${post.section}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'MuiCV',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/mui-logo.png` },
    },
    keywords: post.keywords,
    inLanguage: locale,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: strings.breadcrumbHome,
        item: `${SITE_URL}${marketingHref(locale, '/')}`,
      },
      { '@type': 'ListItem', position: 2, name: strings.breadcrumbPosts, item: `${SITE_URL}${prefix}/posts` },
      { '@type': 'ListItem', position: 3, name: sectionLabel, item: `${SITE_URL}${sectionHref}` },
      { '@type': 'ListItem', position: 4, name: post.title, item: postUrl },
    ],
  };

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <article>
        <header className="border-b border-rule bg-paper/55">
          <div className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-16">
            <Breadcrumb
              items={[
                { name: strings.breadcrumbHome, href: marketingHref(locale, '/') },
                { name: strings.breadcrumbPosts, href: `${prefix}/posts` },
                { name: sectionLabel, href: sectionHref },
                { name: post.title },
              ]}
            />
            <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
              {post.publishedAt} · {post.author}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.8vw,3.5rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
              {post.title}
            </h1>
            <p className="mt-5 text-[17px] leading-[1.75] text-ink-soft">{post.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-rule bg-cream px-3 py-1 text-[12px] text-mute">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-14">
          <MarkdownBody markdown={post.bodyMarkdown} />
          <div className="mt-12 rounded-xl border-2 border-ink bg-yellow p-6 text-on-yellow shadow-[0_4px_0_0_var(--color-yellow-shadow)]">
            <h2 className="text-[20px] font-extrabold">{strings.ctaTitle}</h2>
            <p className="mt-2 text-[14px] leading-[1.7] text-on-yellow-soft">{strings.ctaBody}</p>
            <Link
              href={marketingHref(locale, '/download')}
              className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-extrabold text-on-yellow"
            >
              {strings.ctaLink}
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
