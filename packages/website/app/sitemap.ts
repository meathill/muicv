import { CONTENT_LOCALES, contentLocalePrefix, POST_SECTION_META, SAMPLE_RESUME_TEMPLATES } from '@muicv/shared';
import type { MetadataRoute } from 'next';
import { LOCALES, type Locale } from '@/app/(zh)/(marketing)/_i18n/locale';
import { getWebsitePublishedChangelog, getWebsitePublishedPosts, getWebsitePublishedSkills } from '@/lib/cms-content';

const BASE = 'https://muicv.com';

/** 营销页在某语言下的路径：zh 无前缀，其余 /<locale>；'/' 特判不带结尾斜杠之外的前缀拼接。 */
function marketingPath(locale: Locale, path: string): string {
  if (locale === 'zh') return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** hreflang 键：默认语言用 zh-CN，其余与 URL 段同名。 */
function hreflangKey(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : locale;
}

/** 9 语言齐备的营销页 alternates（sitemap 必须绝对 URL）。 */
function marketingAlternates(path: string) {
  return { languages: Object.fromEntries(LOCALES.map((l) => [hreflangKey(l), `${BASE}${marketingPath(l, path)}`])) };
}

/** 只有 zh/en 的页面 alternates（模板库：模板数据只有中英双语）。 */
function bilingualAlternates(path: string) {
  return {
    languages: {
      'zh-CN': `${BASE}${path}`,
      en: `${BASE}${marketingPath('en', path)}`,
    },
  };
}

// sitemap 走 ISR：1 小时刷一次。爬虫不会每秒访问，不需要 force-dynamic 让 D1 每次硬扛。
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const [postsZh, skills, changelog] = await Promise.all([
    getWebsitePublishedPosts('zh-CN'),
    getWebsitePublishedSkills(),
    getWebsitePublishedChangelog(),
  ]);
  // 非默认语言的文章 URL（每个 locale 一组），用于 sitemap 收录与 hreflang。
  const localizedPosts = Object.fromEntries(
    await Promise.all(
      CONTENT_LOCALES.filter((locale) => locale !== 'zh-CN').map(async (locale) => [
        locale,
        await getWebsitePublishedPosts(locale),
      ]),
    ),
  ) as Partial<Record<(typeof CONTENT_LOCALES)[number], typeof postsZh>>;
  const changelogLastModified = changelog.reduce<Date>(
    (latest, item) => maxDate(latest, toDate(item.updatedAt)),
    new Date(0),
  );
  // 9 语言齐备的营销页（路径 → 优先级/频率）。
  const marketingPages = [
    { path: '/', priority: 1, changeFrequency: 'weekly' as const },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/download', priority: 0.7, changeFrequency: 'weekly' as const },
  ];
  const pages: StaticSitemapPage[] = [
    // 营销页：每种语言各一条，alternates 互指
    ...LOCALES.flatMap((locale) =>
      marketingPages.map((page) => ({
        path: marketingPath(locale, page.path),
        priority: page.priority,
        changeFrequency: page.changeFrequency,
        alternates: marketingAlternates(page.path),
      })),
    ),
    // 模板库：模板数据只有 zh/en 两套，故只收录这两种语言
    { path: '/templates', priority: 0.85, changeFrequency: 'weekly', alternates: bilingualAlternates('/templates') },
    { path: '/en/templates', priority: 0.85, changeFrequency: 'weekly', alternates: bilingualAlternates('/templates') },
    { path: '/posts', priority: 0.7, changeFrequency: 'weekly' },
    ...Object.values(POST_SECTION_META).map((section) => ({
      path: section.path,
      priority: section.path === '/posts/jobs' ? 0.8 : 0.55,
      changeFrequency: 'weekly' as const,
    })),
    // 非默认语言的文章列表页（带前缀；en 的 /en/posts 也在此列）
    ...CONTENT_LOCALES.filter((locale) => locale !== 'zh-CN').flatMap((locale) => {
      const prefix = contentLocalePrefix(locale);
      return [
        { path: `${prefix}/posts`, priority: 0.7, changeFrequency: 'weekly' as const },
        ...Object.keys(POST_SECTION_META).map((section) => ({
          path: `${prefix}/posts/${section}`,
          priority: section === 'jobs' ? 0.75 : 0.55,
          changeFrequency: 'weekly' as const,
        })),
      ];
    }),
    { path: '/skills', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];
  const templatePages = SAMPLE_RESUME_TEMPLATES.flatMap((item) => {
    const slug = encodeURIComponent(item.slug);
    const alternates = {
      languages: {
        'zh-CN': `${BASE}/templates/${slug}`,
        en: `${BASE}/en/templates/${slug}`,
      },
    };
    return [
      {
        path: `/templates/${slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: generatedAt,
        alternates,
      },
      {
        path: `/en/templates/${slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: generatedAt,
        alternates,
      },
    ];
  });
  const postAlternatesFor = (section: string, slug: string) => ({
    languages: Object.fromEntries(
      CONTENT_LOCALES.map((locale) => [
        locale,
        `${contentLocalePrefix(locale)}/posts/${section}/${encodeURIComponent(slug)}`,
      ]),
    ),
  });
  const contentPages = [
    ...templatePages,
    // 中文文章（无前缀）
    ...postsZh.map((post) => {
      const path = `${POST_SECTION_META[post.section].path}/${encodeURIComponent(post.slug)}`;
      return {
        path,
        priority: post.section === 'jobs' ? 0.75 : 0.6,
        changeFrequency: 'monthly' as const,
        lastModified: toDate(post.updatedAt),
        alternates: postAlternatesFor(post.section, post.slug),
      };
    }),
    // 非默认语言文章（带前缀），只有该语言确实有译文时才收录
    ...Object.entries(localizedPosts).flatMap(([locale, posts]) =>
      (posts ?? []).map((post) => ({
        path: `${contentLocalePrefix(locale as (typeof CONTENT_LOCALES)[number])}/posts/${post.section}/${encodeURIComponent(post.slug)}`,
        priority: post.section === 'jobs' ? 0.75 : 0.6,
        changeFrequency: 'monthly' as const,
        lastModified: toDate(post.updatedAt),
        alternates: postAlternatesFor(post.section, post.slug),
      })),
    ),
    ...skills.map((skill) => ({
      path: `/skills/${encodeURIComponent(skill.slug)}`,
      priority: 0.7,
      changeFrequency: 'weekly' as const,
      lastModified: toDate(skill.updatedAt),
    })),
  ];
  const staticPages = pages.map((page) => ({
    ...page,
    lastModified: page.path === '/changelog' ? nonEpoch(changelogLastModified, generatedAt) : generatedAt,
  }));

  return [...staticPages, ...contentPages].map((page) => {
    const entry: MetadataRoute.Sitemap[number] = {
      url: `${BASE}${page.path}`,
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    };
    if ('alternates' in page && page.alternates) {
      entry.alternates = page.alternates;
    }
    return entry;
  });
}

type StaticSitemapPage = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  alternates?: { languages: Record<string, string> };
};

function toDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function nonEpoch(value: Date, fallback: Date): Date {
  return value.getTime() === 0 ? fallback : value;
}
