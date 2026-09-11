import type { CollectionConfig } from 'payload';

import { publishedOrAuthenticated } from './access.ts';
import { CONTENT_LOCALES } from './content-locales.ts';
import { validateSlugFormat } from './validate-slug.ts';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: publishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'section', 'locale', 'status', 'updatedAt'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [validateSlugFormat('posts')],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    // slug 不再是全局唯一：同一篇文章的各语言译文共享同一个 slug，
    // 「同一翻译组」由 slug 标识，唯一性下沉到 (locale, slug) 复合索引。
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'zh-CN',
      options: CONTENT_LOCALES.map((value) => ({ label: value === 'zh-CN' ? '简体中文' : value, value })),
    },
    {
      name: 'section',
      type: 'select',
      required: true,
      defaultValue: 'jobs',
      options: [
        { label: '求职博文', value: 'jobs' },
        { label: '产品文章', value: 'product' },
        { label: '使用教程', value: 'guide' },
      ],
    },
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
    { name: 'author', type: 'text', defaultValue: 'Mui简历', required: true },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'seoTitle', type: 'text', required: true },
    { name: 'seoDescription', type: 'textarea', required: true },
  ],
  indexes: [
    {
      fields: ['locale', 'slug'],
      unique: true,
    },
  ],
};
