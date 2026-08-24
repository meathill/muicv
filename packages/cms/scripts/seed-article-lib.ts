/** 多站点文章 seed 的纯函数部分：markdown 解析、payload 组装、数据源解析。
 *  与 collections/articles.ts 的字段保持一致（这里不 import payload，保证脚本零依赖可独立运行）。 */

export const SEED_SITES = ['muicv', 'dyqr', 'taomenu'] as const;
export type SeedSite = (typeof SEED_SITES)[number];

export type SeedArticleInput = {
  slug: string;
  locale: string;
  markdown: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CmsArticlePayload = {
  site: SeedSite;
  locale: string;
  title: string;
  slug: string;
  status: 'published';
  _status: 'published';
  summary: string;
  bodyMarkdown: string;
  tags: Array<{ value: string }>;
  keywords: Array<{ value: string }>;
  author: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

const EXCERPT_MAX_LENGTH = 180;

export function extractMarkdownTitle(markdown: string): string {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const match = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line.trim());
    if (match?.[2]) {
      return stripInlineMarkup(match[2]);
    }
  }
  return '';
}

export function extractMarkdownExcerpt(markdown: string, maxLength = EXCERPT_MAX_LENGTH): string {
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const text = stripInlineMarkup(trimmed);
    if (!text) {
      continue;
    }
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
  }
  return '';
}

export function buildArticlePayload(
  input: SeedArticleInput,
  options: { site: SeedSite; author: string },
): CmsArticlePayload {
  const title = extractMarkdownTitle(input.markdown) || input.slug;
  const excerpt = extractMarkdownExcerpt(input.markdown);
  const publishedAt = input.createdAt || input.updatedAt || new Date().toISOString();

  return {
    site: options.site,
    locale: input.locale,
    title,
    slug: input.slug,
    status: 'published',
    _status: 'published',
    summary: excerpt || title,
    bodyMarkdown: input.markdown,
    tags: [],
    keywords: [],
    author: options.author,
    publishedAt,
    seoTitle: title,
    seoDescription: excerpt || title,
  };
}

/** dyqr 公开只读接口返回的形状（app-schema blog_posts 的子集）。 */
type DyqrSiteContent = {
  blogPosts?: Array<{
    slug?: unknown;
    lang?: unknown;
    markdown?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  }>;
};

export function parseDyqrSiteContent(value: unknown): SeedArticleInput[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const posts = (value as DyqrSiteContent).blogPosts;
  if (!Array.isArray(posts)) {
    return [];
  }

  const result: SeedArticleInput[] = [];
  for (const post of posts) {
    const slug = typeof post.slug === 'string' ? post.slug : '';
    const locale = typeof post.lang === 'string' ? post.lang : '';
    const markdown = typeof post.markdown === 'string' ? post.markdown : '';
    if (!slug || !locale || !markdown.trim()) {
      continue;
    }
    result.push({
      slug,
      locale,
      markdown,
      ...(typeof post.createdAt === 'string' ? { createdAt: post.createdAt } : {}),
      ...(typeof post.updatedAt === 'string' ? { updatedAt: post.updatedAt } : {}),
    });
  }
  return result;
}

function stripInlineMarkup(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
