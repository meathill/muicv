import type { SkillAppAvailability, SkillDistributionMode, SkillPublisherType } from '@muicv/shared';
import * as z from 'zod/v4';

import { contentStatusSchema, slugifyTitle } from './post-input.ts';

const stringListSchema = z.array(z.string().trim().min(1)).default([]);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能使用小写字母、数字和连字符');

export const skillPublisherTypeSchema = z.enum(['muicv', 'official', 'community']);
export const skillDistributionModeSchema = z.enum(['built_in', 'link_only', 'hosted', 'external_direct']);
export const skillAppAvailabilitySchema = z.enum(['built_in', 'link_only', 'installable', 'coming_soon']);

export const skillFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  status: contentStatusSchema.default('draft'),
  publisher: z.string().trim().min(1).max(120),
  publisherType: skillPublisherTypeSchema.default('community'),
  sourceUrl: z.string().trim().url().optional(),
  sourceLabel: z.string().trim().min(1).max(80).optional(),
  sourceNote: z.string().trim().min(1).max(240).optional(),
  distributionMode: skillDistributionModeSchema.default('link_only'),
  appAvailability: skillAppAvailabilitySchema.default('link_only'),
  summary: z.string().trim().min(1).max(320),
  bodyMarkdown: z.string().trim().min(1),
  useCases: stringListSchema,
  tags: stringListSchema,
  keywords: stringListSchema,
  disclaimer: z.string().trim().min(1).max(320).optional(),
  publishedAt: z.string().trim().min(1).optional(),
  seoTitle: z.string().trim().min(1).max(120).optional(),
  seoDescription: z.string().trim().min(1).max(320).optional(),
});

export const createSkillInputSchema = skillFieldsSchema.extend({
  dryRun: z.boolean().default(false),
});

export const upsertSkillInputSchema = createSkillInputSchema.extend({
  onConflict: z.enum(['error', 'update']).default('update'),
});

export const getSkillInputSchema = z.object({
  slug: slugSchema,
});

export type CreateSkillInput = z.output<typeof createSkillInputSchema>;
export type UpsertSkillInput = z.output<typeof upsertSkillInputSchema>;
export type GetSkillInput = z.output<typeof getSkillInputSchema>;

export type PayloadArrayField = Array<{ value: string }>;

export type CmsSkillPayload = {
  title: string;
  slug: string;
  status: CreateSkillInput['status'];
  _status: CreateSkillInput['status'];
  publisher: string;
  publisherType: SkillPublisherType;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceNote?: string;
  distributionMode: SkillDistributionMode;
  appAvailability: SkillAppAvailability;
  summary: string;
  bodyMarkdown: string;
  useCases: PayloadArrayField;
  tags: PayloadArrayField;
  keywords: PayloadArrayField;
  disclaimer?: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type NormalizedCreateSkillInput = {
  dryRun: boolean;
  payload: CmsSkillPayload;
};

export type NormalizedUpsertSkillInput = NormalizedCreateSkillInput & {
  onConflict: UpsertSkillInput['onConflict'];
};

export function normalizeCreateSkillInput(input: unknown, now = new Date()): NormalizedCreateSkillInput {
  const parsed = createSkillInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    payload: buildSkillPayload(parsed, now),
  };
}

export function normalizeUpsertSkillInput(input: unknown, now = new Date()): NormalizedUpsertSkillInput {
  const parsed = upsertSkillInputSchema.parse(input);
  return {
    dryRun: parsed.dryRun,
    onConflict: parsed.onConflict,
    payload: buildSkillPayload(parsed, now),
  };
}

export function normalizeGetSkillInput(input: unknown): GetSkillInput {
  return getSkillInputSchema.parse(input);
}

function buildSkillPayload(input: CreateSkillInput, now: Date): CmsSkillPayload {
  const slug = input.slug ?? slugifyTitle(input.title, now);
  return {
    title: input.title,
    slug,
    status: input.status,
    _status: input.status,
    publisher: input.publisher,
    publisherType: input.publisherType,
    ...optionalString('sourceUrl', input.sourceUrl),
    ...optionalString('sourceLabel', input.sourceLabel),
    ...optionalString('sourceNote', input.sourceNote),
    distributionMode: input.distributionMode,
    appAvailability: input.appAvailability,
    summary: input.summary,
    bodyMarkdown: input.bodyMarkdown,
    useCases: toPayloadArray(input.useCases),
    tags: toPayloadArray(input.tags),
    keywords: toPayloadArray(input.keywords),
    ...optionalString('disclaimer', input.disclaimer),
    publishedAt: input.publishedAt ?? formatDate(now),
    seoTitle: input.seoTitle ?? input.title,
    seoDescription: input.seoDescription ?? input.summary,
  };
}

function toPayloadArray(values: string[]): PayloadArrayField {
  return values.map((value) => ({ value }));
}

function optionalString<Key extends 'sourceUrl' | 'sourceLabel' | 'sourceNote' | 'disclaimer'>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> {
  return value ? ({ [key]: value } as Record<Key, string>) : {};
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
