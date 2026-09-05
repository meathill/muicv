import type { CollectionConfig } from 'payload';

import { publishedOrAuthenticated } from './access.ts';
import { validateSlugFormat } from './validate-slug.ts';

/** 多站点共用博客：site + locale + slug 唯一。
 *  与 muicv 自己的 posts（求职博文）互不影响。 */
export const ARTICLE_SITES = ['muicv', 'dyqr', 'taomenu', 'muirouter'] as const;
export const ARTICLE_LOCALES = ['en', 'zh-CN', 'de', 'fr', 'es', 'pt', 'th', 'vi', 'ja'] as const;

export type ArticleSite = (typeof ARTICLE_SITES)[number];
export type ArticleLocale = (typeof ARTICLE_LOCALES)[number];

function buildOptions<const T extends readonly string[]>(values: T, labels?: Record<string, string>) {
  return values.map((value) => ({ label: labels?.[value] ?? value, value }));
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  access: {
    read: publishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'site', 'locale', 'status', 'publishedAt'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [validateSlugFormat('articles')],
  },
  fields: [
    { name: 'site', type: 'select', required: true, defaultValue: 'muicv', options: buildOptions(ARTICLE_SITES) },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: buildOptions(ARTICLE_LOCALES, { 'zh-CN': '简体中文' }),
    },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
      ],
    },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'bodyMarkdown', type: 'textarea', required: true },
    { name: 'tags', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
    { name: 'keywords', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
    {
      name: 'sources',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    { name: 'sourcePublishedAt', type: 'date' },
    { name: 'readingMinutes', type: 'number' },
    { name: 'author', type: 'text', required: true },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'seoTitle', type: 'text', required: true },
    { name: 'seoDescription', type: 'textarea', required: true },
  ],
  indexes: [
    {
      fields: ['site', 'locale', 'slug'],
      unique: true,
    },
  ],
};
