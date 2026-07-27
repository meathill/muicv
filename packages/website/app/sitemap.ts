import { POST_SECTION_META } from '@muicv/shared';
import type { MetadataRoute } from 'next';
import { getWebsitePublishedChangelog, getWebsitePublishedPosts, getWebsitePublishedSkills } from '@/lib/cms-content';

const BASE = 'https://muicv.com';

// 双语页对的 hreflang（sitemap 里必须用绝对 URL）。加英文页就往这里加对应映射。
const HOME_ALT = { languages: { 'zh-CN': `${BASE}/`, en: `${BASE}/en` } };
const DOWNLOAD_ALT = { languages: { 'zh-CN': `${BASE}/download`, en: `${BASE}/en/download` } };
const PRICING_ALT = { languages: { 'zh-CN': `${BASE}/pricing`, en: `${BASE}/en/pricing` } };
const ABOUT_ALT = { languages: { 'zh-CN': `${BASE}/about`, en: `${BASE}/en/about` } };
const CONTACT_ALT = { languages: { 'zh-CN': `${BASE}/contact`, en: `${BASE}/en/contact` } };

// sitemap 走 ISR：1 小时刷一次。爬虫不会每秒访问，不需要 force-dynamic 让 D1 每次硬扛。
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const generatedAt = new Date();
  const [posts, skills, changelog] = await Promise.all([
    getWebsitePublishedPosts(),
    getWebsitePublishedSkills(),
    getWebsitePublishedChangelog(),
  ]);
  const changelogLastModified = changelog.reduce<Date>(
    (latest, item) => maxDate(latest, toDate(item.updatedAt)),
    new Date(0),
  );
  const pages: StaticSitemapPage[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly', alternates: HOME_ALT },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly', alternates: PRICING_ALT },
    { path: '/about', priority: 0.6, changeFrequency: 'monthly', alternates: ABOUT_ALT },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly', alternates: CONTACT_ALT },
    { path: '/download', priority: 0.7, changeFrequency: 'weekly', alternates: DOWNLOAD_ALT },
    // 英文营销页（增量加页时往这里补，并给对应中文页加 alternates）
    { path: '/en', priority: 1, changeFrequency: 'weekly', alternates: HOME_ALT },
    { path: '/en/download', priority: 0.7, changeFrequency: 'weekly', alternates: DOWNLOAD_ALT },
    { path: '/en/pricing', priority: 0.9, changeFrequency: 'monthly', alternates: PRICING_ALT },
    { path: '/en/about', priority: 0.6, changeFrequency: 'monthly', alternates: ABOUT_ALT },
    { path: '/en/contact', priority: 0.5, changeFrequency: 'monthly', alternates: CONTACT_ALT },
    { path: '/posts', priority: 0.7, changeFrequency: 'weekly' },
    ...Object.values(POST_SECTION_META).map((section) => ({
      path: section.path,
      priority: section.path === '/posts/jobs' ? 0.8 : 0.55,
      changeFrequency: 'weekly' as const,
    })),
    { path: '/skills', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/changelog', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];
  const contentPages = [
    ...posts.map((post) => ({
      path: `${POST_SECTION_META[post.section].path}/${encodeURIComponent(post.slug)}`,
      priority: post.section === 'jobs' ? 0.75 : 0.6,
      changeFrequency: 'monthly' as const,
      lastModified: toDate(post.updatedAt),
    })),
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
