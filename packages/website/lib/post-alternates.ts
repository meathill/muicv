import { CONTENT_LOCALES, type ContentLocale, contentLocalePrefix } from '@muicv/shared';

export type PostRef = { section: string; slug: string };

/**
 * 文章详情 alternates：只列真实有译文的语言（同一 slug 在各语言下聚合），
 * 不存在的语言不列——列了就是 hreflang / sitemap 指向 404，对 SEO 有害。
 *
 * head hreflang（相对路径，由 metadataBase 解析）与 sitemap（绝对 URL）共用同一函数，
 * 只是 base 不同，保证两处规则同源。
 */
export function postAlternateLanguages(
  postsByLocale: Partial<Record<ContentLocale, PostRef[]>>,
  section: string,
  slug: string,
  baseUrl: string,
): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of CONTENT_LOCALES) {
    const posts = postsByLocale[locale] ?? [];
    if (posts.some((post) => post.section === section && post.slug === slug)) {
      languages[locale] = `${baseUrl}${contentLocalePrefix(locale)}/posts/${section}/${encodeURIComponent(slug)}`;
    }
  }
  return languages;
}
