import {
  type ContentLocale,
  DEFAULT_CONTENT_LOCALE,
  fetchCmsPostBySlug,
  fetchCmsPublishedChangelog,
  fetchCmsPublishedPosts,
  fetchCmsPublishedSkills,
  fetchCmsSkillBySlug,
  isContentLocale,
  type PostSection,
} from '@muicv/shared';
import type { Context } from 'hono';

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

/** 内容接口的 locale 入参。缺省 / 非法都回落到默认语言（zh-CN）。 */
function readLocale(c: Context): ContentLocale {
  const raw = c.req.query('locale');
  return raw && isContentLocale(raw) ? raw : DEFAULT_CONTENT_LOCALE;
}

function getCmsOptions(c: Context) {
  const env = c.env as { MUICV_CMS_URL?: unknown };
  return typeof env.MUICV_CMS_URL === 'string' && env.MUICV_CMS_URL.trim() ? { baseUrl: env.MUICV_CMS_URL.trim() } : {};
}

export async function handleSkillsCatalog(c: Context) {
  const skills = (await fetchCmsPublishedSkills(getCmsOptions(c))).map((skill) => ({
    slug: skill.slug,
    title: skill.title,
    publisher: skill.publisher,
    publisherType: skill.publisherType,
    sourceUrl: null,
    sourceLabel: skill.sourceLabel ?? null,
    sourceNote: skill.sourceNote ?? null,
    distributionMode: skill.distributionMode,
    appAvailability: skill.appAvailability,
    summary: skill.summary,
    useCases: skill.useCases,
    tags: skill.tags,
    updatedAt: skill.updatedAt,
    detailUrl: `https://muicv.com/skills/${skill.slug}`,
    disclaimer: skill.disclaimer ?? null,
  }));

  return c.json({
    manifestVersion: 1,
    generatedAt: new Date().toISOString(),
    skills,
  });
}

export async function handleSkillDetail(c: Context) {
  const slug = c.req.param('slug');
  const skill = await fetchCmsSkillBySlug(slug, getCmsOptions(c));
  if (!skill) return c.json({ error: 'skill-not-found' }, 404);

  return c.json({
    ...skill,
    detailUrl: `https://muicv.com/skills/${skill.slug}`,
    installPackage: null,
  });
}

export async function handlePostsList(c: Context) {
  const sectionRaw = c.req.query('section');
  if (sectionRaw && !isPostSection(sectionRaw)) {
    return c.json({ error: 'invalid-section' }, 400);
  }
  const locale = readLocale(c);
  const prefix = locale === DEFAULT_CONTENT_LOCALE ? '' : `/${locale}`;
  const posts = (await fetchCmsPublishedPosts(locale, sectionRaw, getCmsOptions(c))).map((post) => ({
    slug: post.slug,
    locale: post.locale,
    section: post.section,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    url: `https://muicv.com${prefix}/posts/${post.section}/${post.slug}`,
  }));
  return c.json({ posts });
}

export async function handlePostDetail(c: Context) {
  const section = c.req.param('section');
  const slug = c.req.param('slug');
  if (!isPostSection(section)) return c.json({ error: 'invalid-section' }, 400);

  const locale = readLocale(c);
  const prefix = locale === DEFAULT_CONTENT_LOCALE ? '' : `/${locale}`;
  const post = await fetchCmsPostBySlug(locale, section, slug, getCmsOptions(c));
  if (!post) return c.json({ error: 'post-not-found' }, 404);
  return c.json({ ...post, url: `https://muicv.com${prefix}/posts/${post.section}/${post.slug}` });
}

export async function handleChangelog(c: Context) {
  return c.json({ items: await fetchCmsPublishedChangelog(getCmsOptions(c)) });
}
