import type { CollectionConfig } from 'payload';

import { publishedOrAuthenticated } from './access';
import { validateSlugFormat } from './validate-slug';

export const SkillExtensions: CollectionConfig = {
  slug: 'skillExtensions',
  access: {
    read: publishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publisher', 'distributionMode', 'status'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [validateSlugFormat('skillExtensions')],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
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
    { name: 'publisher', type: 'text', required: true },
    {
      name: 'publisherType',
      type: 'select',
      required: true,
      defaultValue: 'community',
      options: [
        { label: 'Mui 自有', value: 'muicv' },
        { label: '第三方官方', value: 'official' },
        { label: '社区', value: 'community' },
      ],
    },
    { name: 'sourceUrl', type: 'text' },
    { name: 'sourceLabel', type: 'text' },
    { name: 'sourceNote', type: 'textarea' },
    {
      name: 'distributionMode',
      type: 'select',
      required: true,
      defaultValue: 'link_only',
      options: [
        { label: '已内置', value: 'built_in' },
        { label: '来源索引', value: 'link_only' },
        { label: 'Mui 托管', value: 'hosted' },
        { label: '官方直装', value: 'external_direct' },
      ],
    },
    {
      name: 'appAvailability',
      type: 'select',
      required: true,
      defaultValue: 'link_only',
      options: [
        { label: '已内置', value: 'built_in' },
        { label: '查看来源', value: 'link_only' },
        { label: '可安装', value: 'installable' },
        { label: '整理中', value: 'coming_soon' },
      ],
    },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'bodyMarkdown', type: 'textarea', required: true },
    { name: 'useCases', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
    { name: 'tags', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
    { name: 'keywords', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
    { name: 'disclaimer', type: 'textarea' },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'seoTitle', type: 'text', required: true },
    { name: 'seoDescription', type: 'textarea', required: true },
  ],
};
