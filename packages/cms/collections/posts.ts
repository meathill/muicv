import type { CollectionConfig } from 'payload';

import { publishedOrAuthenticated } from './access';
import { validateSlugFormat } from './validate-slug';

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: publishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'section', 'status', 'updatedAt'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [validateSlugFormat('posts')],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
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
};
