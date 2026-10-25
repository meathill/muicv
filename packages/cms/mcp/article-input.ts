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

const sourceSchema = z.object({
  label: z.string().trim().min(1),
  url: z.string().trim().min(1),
});

export const articleFieldsSchema = z.object({
  site: articleSiteSchema,
  locale: articleLocaleSchema.default('zh-CN'),
  title: z.string().trim().min(1).max(200),
  slug: slugSchema,
  status: contentStatusSchema.default('draft'),
  summary: z.string().trim().min(1).max(400),
  bodyMarkdown: z.string().trim().min(1),
  tags: stringListSchema,
  keywords: stringListSchema,
  sources: z.array(sourceSchema).default([]),
  sourcePublishedAt: z.string().trim().min(1).optional(),
  readingMinutes: z.number().int().positive().optional(),
  author: z.string().trim().min(1).default('Mui团队'),
  publishedAt: z.string().trim().min(1).optional(),
  seoTitle: z.string().trim().min(1).max(200).optional(),
  seoDescription: z.string().trim().min(1).max(400).optional(),
});

export const createArticleInputSchema = articleFieldsSchema.extend({
  dryRun: z.boolean().default(false),
});

export const upsertArticleInputSchema = createArticleInputSchema.extend({
  onConflict: z.enum(['error', 'update']).default('update'),
});

export const getArticleInputSchema = z.object({
  site: articleSiteSchema,
  slug: slugSchema,
  locale: articleLocaleSchema.default('zh-CN'),
});

export type CreateArticleInput = z.output<typeof createArticleInputSchema>;
export type UpsertArticleInput = z.output<typeof upsertArticleInputSchema>;
export type GetArticleInput = z.output<typeof getArticleInputSchema>;

export type PayloadArrayField = Array<{ value: string }>;
export type PayloadSourceField = Array<{ label: string; url: string }>;

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
  sources: PayloadSourceField;
  sourcePublishedAt?: string;
  readingMinutes?: number;
  author: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type NormalizedCreateArticleInput = {
  dryRun: boolean;
  payload: CmsArticlePayload;
};

export type NormalizedUpsertArticleInput = {
  dryRun: boolean;
  onConflict: 'error' | 'update';
  payload: CmsArticlePayload;
};

export function normalizeCreateArticleInput(input: unknown, now = new Date()): NormalizedCreateArticleInput {
  const parsed = createArticleInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    payload: buildArticlePayload(parsed, now),
  };
}

export function normalizeUpsertArticleInput(input: unknown, now = new Date()): NormalizedUpsertArticleInput {
  const parsed = upsertArticleInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    onConflict: parsed.onConflict,
    payload: buildArticlePayload(parsed, now),
  };
}

export function normalizeGetArticleInput(input: unknown): GetArticleInput {
  return getArticleInputSchema.parse(input);
}

export function normalizeUpsertArticlePayload(input: UpsertArticleInput, now = new Date()): CmsArticlePayload {
  return buildArticlePayload(input, now);
}

function buildArticlePayload(input: CreateArticleInput, now: Date): CmsArticlePayload {
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
    sources: input.sources.map((source) => ({ label: source.label, url: source.url })),
    ...(input.sourcePublishedAt ? { sourcePublishedAt: input.sourcePublishedAt } : {}),
    ...(typeof input.readingMinutes === 'number' ? { readingMinutes: input.readingMinutes } : {}),
    author: input.author,
    publishedAt: input.publishedAt ?? now.toISOString().slice(0, 10),
    seoTitle: input.seoTitle ?? input.title,
    seoDescription: input.seoDescription ?? input.summary,
  };
}
