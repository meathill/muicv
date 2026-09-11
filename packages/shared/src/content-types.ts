import type { ContentLocale } from './content-locales.ts';

export type ContentStatus = 'draft' | 'published';

export type PostSection = 'jobs' | 'product' | 'guide';

export type ContentPost = {
  slug: string;
  /** 语言。同一篇文章的各语言译文共享同一个 slug，靠 locale 区分。 */
  locale: ContentLocale;
  section: PostSection;
  status: ContentStatus;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  keywords: string[];
  author: string;
  publishedAt: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type SkillPublisherType = 'muicv' | 'official' | 'community';
export type SkillDistributionMode = 'built_in' | 'link_only' | 'hosted' | 'external_direct';
export type SkillAppAvailability = 'built_in' | 'link_only' | 'installable' | 'coming_soon';

export type SkillCatalogItem = {
  slug: string;
  status: ContentStatus;
  title: string;
  publisher: string;
  publisherType: SkillPublisherType;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceNote?: string;
  distributionMode: SkillDistributionMode;
  appAvailability: SkillAppAvailability;
  summary: string;
  bodyMarkdown: string;
  useCases: string[];
  tags: string[];
  keywords: string[];
  disclaimer?: string;
  publishedAt: string;
  updatedAt: string;
  seoTitle: string;
  seoDescription: string;
};

export type ChangelogItem = {
  slug: string;
  status: ContentStatus;
  title: string;
  summary: string;
  bodyMarkdown: string;
  version?: string;
  publishedAt: string;
  updatedAt: string;
};

export const POST_SECTION_META: Record<PostSection, { label: string; path: string; description: string }> = {
  jobs: {
    label: '求职博文',
    path: '/posts/jobs',
    description: '围绕校招、社招、简历、面试、offer 决策的实用文章。',
  },
  product: {
    label: '产品文章',
    path: '/posts/product',
    description: 'Mui 简历的产品思考、能力说明和使用方式。',
  },
  guide: {
    label: '使用教程',
    path: '/posts/guide',
    description: '从下载安装到素材整理、简历生成、面试复盘的操作指南。',
  },
};
