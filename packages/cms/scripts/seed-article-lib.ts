/** 多站点文章 seed 的纯函数部分：markdown 解析、payload 组装、数据源解析。
 *  与 collections/articles.ts 的字段保持一致（这里不 import payload，保证脚本零依赖可独立运行）。 */
import type { UpsertArticleInput } from '../mcp/article-input.ts';

export const SEED_SITES = ['muicv', 'dyqr', 'taomenu', 'muirouter'] as const;
export type SeedSite = (typeof SEED_SITES)[number];

export type SeedArticleInput = {
  slug: string;
  locale: string;
  markdown: string;
  createdAt?: string;
  updatedAt?: string;
};

/** mui-api 导出 JSON 里的单条文章形状（scripts/export-blog-for-cms.ts 产出）。 */
export type MuiApiExportArticle = {
  locale?: unknown;
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  bodyMarkdown?: unknown;
  tags?: unknown;
  keywords?: unknown;
  sources?: unknown;
  sourcePublishedAt?: unknown;
  readingMinutes?: unknown;
  author?: unknown;
  publishedAt?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
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

/** mui-api 导出 JSON 的整体形状（{ articles: [...] }）。 */
type MuiApiExportFile = {
  articles?: unknown;
};

/** 解析 mui-api 导出的完整 metadata 文章列表。
 *  与 dyqr 不同，mui-api 导出自带 title/summary/tags/sources 等完整字段，
 *  直接映射为 upsert 输入，非法条目跳过；最终仍由主流程的 zod schema 校验兜底。 */
export function parseMuiApiExport(value: unknown): UpsertArticleInput[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const articles = (value as MuiApiExportFile).articles;
  if (!Array.isArray(articles)) {
    return [];
  }

  const result: UpsertArticleInput[] = [];
  for (const raw of articles) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const article = raw as MuiApiExportArticle;
    const locale = readString(article.locale);
    const slug = readString(article.slug);
    const title = readString(article.title);
    const summary = readString(article.summary);
    const bodyMarkdown = readString(article.bodyMarkdown);
    if (!locale || !slug || !title || !summary || !bodyMarkdown) {
      continue;
    }

    result.push({
      site: 'muirouter',
      locale,
      slug,
      title,
      summary,
      bodyMarkdown,
      status: 'published',
      onConflict: 'update',
      tags: readStringList(article.tags),
      keywords: readStringList(article.keywords),
      sources: readSourceList(article.sources),
      ...(readString(article.sourcePublishedAt) ? { sourcePublishedAt: readString(article.sourcePublishedAt) } : {}),
      ...(typeof article.readingMinutes === 'number' && Number.isFinite(article.readingMinutes)
        ? { readingMinutes: article.readingMinutes }
        : {}),
      author: readString(article.author) ?? 'MuiRouter',
      publishedAt: readString(article.publishedAt) ?? new Date().toISOString(),
      ...(readString(article.seoTitle) ? { seoTitle: readString(article.seoTitle) } : {}),
      ...(readString(article.seoDescription) ? { seoDescription: readString(article.seoDescription) } : {}),
    });
  }
  return result;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readSourceList(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: Array<{ label: string; url: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const label = readString((item as { label?: unknown }).label);
    const url = readString((item as { url?: unknown }).url);
    if (label && url) {
      result.push({ label, url });
    }
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
