import type { CollectionConfig } from 'payload';

import { publishedOrAuthenticated } from './access';
import { validateSlugFormat } from './validate-slug';

export const Changelog: CollectionConfig = {
  slug: 'changelog',
  access: {
    read: publishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'status', 'publishedAt'],
  },
  versions: {
    drafts: true,
  },
  hooks: {
    beforeValidate: [validateSlugFormat('changelog')],
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
    { name: 'version', type: 'text' },
    { name: 'summary', type: 'textarea', required: true },
    { name: 'bodyMarkdown', type: 'textarea', required: true },
    { name: 'publishedAt', type: 'date', required: true },
  ],
};
