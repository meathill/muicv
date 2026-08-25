import * as z from 'zod/v4';

export const postSectionSchema = z.enum(['jobs', 'product', 'guide']);
export const contentStatusSchema = z.enum(['draft', 'published']);

const stringListSchema = z.array(z.string().trim().min(1)).default([]);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能使用小写字母、数字和连字符');

export const postFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  section: postSectionSchema.default('jobs'),
  status: contentStatusSchema.default('draft'),
  summary: z.string().trim().min(1).max(320),
  bodyMarkdown: z.string().trim().min(1),
  tags: stringListSchema,
  keywords: stringListSchema,
  author: z.string().trim().min(1).default('Mui简历'),
  publishedAt: z.string().trim().min(1).optional(),
  seoTitle: z.string().trim().min(1).max(120).optional(),
  seoDescription: z.string().trim().min(1).max(320).optional(),
});

export const createPostInputSchema = postFieldsSchema.extend({
  dryRun: z.boolean().default(false),
});

export const upsertPostInputSchema = createPostInputSchema.extend({
  onConflict: z.enum(['error', 'update']).default('update'),
});

export const getPostInputSchema = z.object({
  slug: slugSchema,
});

export type CreatePostInput = z.output<typeof createPostInputSchema>;
export type CreatePostRawInput = z.input<typeof createPostInputSchema>;
export type UpsertPostInput = z.output<typeof upsertPostInputSchema>;
export type UpsertPostRawInput = z.input<typeof upsertPostInputSchema>;
export type GetPostInput = z.output<typeof getPostInputSchema>;

export type PayloadArrayField = Array<{ value: string }>;

export type CmsPostPayload = {
  title: string;
  slug: string;
  section: CreatePostInput['section'];
  status: CreatePostInput['status'];
  _status: CreatePostInput['status'];
  summary: string;
  bodyMarkdown: string;
  tags: PayloadArrayField;
  keywords: PayloadArrayField;
  author: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type NormalizedCreatePostInput = {
  dryRun: boolean;
  payload: CmsPostPayload;
};

export type NormalizedUpsertPostInput = NormalizedCreatePostInput & {
  onConflict: UpsertPostInput['onConflict'];
};

export function normalizeCreatePostInput(input: unknown, now = new Date()): NormalizedCreatePostInput {
  const parsed = createPostInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    payload: buildPostPayload(parsed, now),
  };
}

export function normalizeUpsertPostInput(input: unknown, now = new Date()): NormalizedUpsertPostInput {
  const parsed = upsertPostInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    onConflict: parsed.onConflict,
    payload: buildPostPayload(parsed, now),
  };
}

export function normalizeGetPostInput(input: unknown): GetPostInput {
  return getPostInputSchema.parse(input);
}

export function slugifyTitle(title: string, now = new Date()): string {
  const slug = title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (slug) {
    return slug.slice(0, 96).replace(/-+$/g, '');
  }

  return `post-${formatDate(now).replaceAll('-', '')}-${String(now.getUTCHours()).padStart(2, '0')}${String(
    now.getUTCMinutes(),
  ).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}`;
}

function buildPostPayload(input: CreatePostInput, now: Date): CmsPostPayload {
  const slug = input.slug ?? slugifyTitle(input.title, now);
  return {
    title: input.title,
    slug,
    section: input.section,
    status: input.status,
    _status: input.status,
    summary: input.summary,
    bodyMarkdown: input.bodyMarkdown,
    tags: toPayloadArray(input.tags),
    keywords: toPayloadArray(input.keywords),
    author: input.author,
    publishedAt: input.publishedAt ?? formatDate(now),
    seoTitle: input.seoTitle ?? input.title,
    seoDescription: input.seoDescription ?? input.summary,
  };
}

function toPayloadArray(values: string[]): PayloadArrayField {
  return values.map((value) => ({ value }));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
