import {
  type ContentLocale,
  CONTENT_LOCALES,
  contentLocalePrefix,
  DEFAULT_CONTENT_LOCALE,
  fetchCmsPostBySlug,
  fetchCmsPublishedChangelog,
  fetchCmsPublishedPosts,
  fetchCmsPublishedSkills,
  fetchCmsSkillBySlug,
  type PostSection,
} from '@muicv/shared';

const WEBSITE_CMS_CACHE = 'force-cache' as const;

function getCmsOptions() {
  const baseUrl = process.env.MUICV_CMS_URL;
  return baseUrl ? { baseUrl, cache: WEBSITE_CMS_CACHE } : { cache: WEBSITE_CMS_CACHE };
}

export function getWebsitePublishedPosts(locale: ContentLocale = DEFAULT_CONTENT_LOCALE, section?: PostSection) {
  return fetchCmsPublishedPosts(locale, section, getCmsOptions());
}

export function getWebsitePostBySlug(locale: ContentLocale, section: PostSection, slug: string) {
  return fetchCmsPostBySlug(locale, section, slug, getCmsOptions());
}

export function getWebsitePublishedSkills() {
  return fetchCmsPublishedSkills(getCmsOptions());
}

export function getWebsiteSkillBySlug(slug: string) {
  return fetchCmsSkillBySlug(slug, getCmsOptions());
}

export function getWebsitePublishedChangelog() {
  return fetchCmsPublishedChangelog(getCmsOptions());
}

/**
 * 某篇文章在各语言下真实存在的 URL 映射（用于 hreflang / sitemap alternates）。
 * 只收录确实有译文的语言——不存在的语言链过去是 404，对 SEO 有害。
 * 各语言的列表页有 ISR force-cache，这里并行取一次即可。
 */
export async function getPostAlternateLanguages(section: PostSection, slug: string): Promise<Record<string, string>> {
  const lists = await Promise.all(
    CONTENT_LOCALES.map(async (locale) => [locale, await getWebsitePublishedPosts(locale)] as const),
  );
  const languages: Record<string, string> = {};
  for (const [locale, posts] of lists) {
    if (posts.some((post) => post.section === section && post.slug === slug)) {
      languages[locale] = `${contentLocalePrefix(locale)}/posts/${section}/${slug}`;
    }
  }
  return languages;
}

/** 文章列表页（含分类页）在各语言下都存在，hreflang 直接按 locale 拼。 */
export function getListAlternateLanguages(section?: PostSection): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of CONTENT_LOCALES) {
    const prefix = contentLocalePrefix(locale);
    languages[locale] = section ? `${prefix}/posts/${section}` : `${prefix}/posts`;
  }
  return languages;
}
