import { JOB_CATEGORIES, OPPORTUNITY_SOURCES, WORKPLACES } from '@muicv/shared';
import type { Access, CollectionConfig, Where } from 'payload';

/**
 * 采集来的国际 / 远程技术岗（由 api worker 的 scheduled 采集（packages/api/src/cron）定时写入）。
 * 与社区贡献 JD（api D1 communityJd）在 /jobs 合并展示，并统一进 Vectorize 做自然语言搜索。
 * 匿名只能读 published；expired 由 cron 按 postedAt 自动标记。
 */
const PUBLISHED_ONLY: Where = { status: { equals: 'published' } };

const readPublishedOrAuthenticated: Access = ({ req }) => (req.user ? true : PUBLISHED_ONLY);

function toOptions(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }));
}

export const Opportunities: CollectionConfig = {
  slug: 'opportunities',
  access: {
    read: readPublishedOrAuthenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'company', 'source', 'workplace', 'status', 'postedAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'company', type: 'text', required: true, index: true },
    { name: 'location', type: 'text' },
    {
      name: 'workplace',
      type: 'select',
      required: true,
      defaultValue: 'onsite',
      index: true,
      options: toOptions(WORKPLACES),
    },
    // 地域限制（见 shared/jobs/location.ts）：remote 岗为候选人须在的国家 / 大区，坐班岗为办公地所在国
    {
      name: 'allowedCountries',
      type: 'json',
      admin: { description: 'ISO alpha-2 数组，如 ["US","CA"]；空 = 未声明限制' },
    },
    {
      name: 'allowedRegions',
      type: 'json',
      admin: { description: 'worldwide / americas / north-america / latam / emea / europe / apac' },
    },
    { name: 'utcOffsetMin', type: 'number', admin: { description: '可接受的候选人时区下限（UTC 小时）' } },
    { name: 'utcOffsetMax', type: 'number' },
    { name: 'officeLocations', type: 'json' },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'engineering',
      index: true,
      options: toOptions(JOB_CATEGORIES),
    },
    { name: 'employmentType', type: 'text' },
    { name: 'summary', type: 'textarea' },
    { name: 'descriptionMarkdown', type: 'textarea' },
    { name: 'applyUrl', type: 'text', required: true },
    { name: 'source', type: 'select', required: true, index: true, options: toOptions(OPPORTUNITY_SOURCES) },
    { name: 'sourceId', type: 'text', required: true },
    // source:sourceId，采集幂等 upsert 的键
    { name: 'dedupeKey', type: 'text', required: true, unique: true },
    // company+title 归一化指纹，跨来源（含社区 JD）去重
    { name: 'fingerprint', type: 'text', required: true, index: true },
    { name: 'postedAt', type: 'date', required: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'published',
      index: true,
      options: [
        { label: '草稿', value: 'draft' },
        { label: '已发布', value: 'published' },
        { label: '已过期', value: 'expired' },
      ],
    },
    { name: 'tags', type: 'array', fields: [{ name: 'value', type: 'text', required: true }] },
  ],
};
