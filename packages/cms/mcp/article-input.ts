import * as z from 'zod/v4';

import { ARTICLE_LOCALES, ARTICLE_SITES } from '../collections/articles.ts';

export const articleSiteSchema = z.enum(ARTICLE_SITES);
export const articleLocaleSchema = z.enum(ARTICLE_LOCALES);
export const contentStatusSchema = z.enum(['draft', 'published']);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能使用小写字母、数字和连字符');

const stringListSchema = z.array(z.string().trim().min(1)).default([]);

export const articleFieldsSchema = z.object({
  site: articleSiteSchema,
  locale: articleLocaleSchema,
  title: z.string().trim().min(1).max(200),
  slug: slugSchema,
  status: contentStatusSchema.default('draft'),
  summary: z.string().trim().min(1).max(400),
  bodyMarkdown: z.string().trim().min(1),
  tags: stringListSchema,
  keywords: stringListSchema,
  author: z.string().trim().min(1),
  publishedAt: z.string().trim().min(1),
  seoTitle: z.string().trim().min(1).max(200).optional(),
  seoDescription: z.string().trim().min(1).max(400).optional(),
});

export const upsertArticleInputSchema = articleFieldsSchema.extend({
  onConflict: z.enum(['error', 'update']).default('update'),
});

export type UpsertArticleInput = z.output<typeof upsertArticleInputSchema>;

export type PayloadArrayField = Array<{ value: string }>;

/** 写入 Payload articles 集合的文档形状（REST body）。 */
export type CmsArticlePayload = {
  site: UpsertArticleInput['site'];
  locale: UpsertArticleInput['locale'];
  title: string;
  slug: string;
  status: UpsertArticleInput['status'];
  _status: UpsertArticleInput['status'];
  summary: string;
  bodyMarkdown: string;
  tags: PayloadArrayField;
  keywords: PayloadArrayField;
  author: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export function normalizeUpsertArticlePayload(input: UpsertArticleInput): CmsArticlePayload {
  return {
    site: input.site,
    locale: input.locale,
    title: input.title,
    slug: input.slug,
    status: input.status,
    _status: input.status,
    summary: input.summary,
    bodyMarkdown: input.bodyMarkdown,
    tags: input.tags.map((value) => ({ value })),
    keywords: input.keywords.map((value) => ({ value })),
    author: input.author,
    publishedAt: input.publishedAt,
    seoTitle: input.seoTitle ?? input.title,
    seoDescription: input.seoDescription ?? input.summary,
  };
}
