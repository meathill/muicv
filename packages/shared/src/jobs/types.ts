import type { LocationRegion } from './countries.ts';
import type { LocationRestrictions, Workplace } from './location.ts';

/**
 * 统一岗位频道（/jobs）的领域类型。
 *
 * 两路来源合并展示、统一检索：
 * - collected：cron 从 Greenhouse / Lever / Ashby / Remotive 公开接口采集，存 CMS `opportunities`（编辑后台）
 * - community：用户用浏览器扩展贡献的 JD，存 D1 `communityJd`（贡献奖励积分）
 * 两者都镜像进 D1 `jobIndex`（结构化列 + FTS5 trigram）与 Vectorize，搜索只查这两处。
 */

export const OPPORTUNITY_SOURCES = [
  'greenhouse',
  'lever',
  'ashby',
  'remotive',
  // 垂直 / 远程岗位板（官方 RSS / JSON，每天 2 次）
  'vuejobs',
  'larajobs',
  'weworkremotely',
  'remoteok',
  'himalayas',
  'jobicy',
  'golangprojects',
] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

/** 雇主自己的 ATS 岗位板：可被搜索引擎收录、可进 sitemap。其余均为第三方岗位板转载。 */
export const INDEXABLE_SOURCES: readonly OpportunitySource[] = ['greenhouse', 'lever', 'ashby'];

/**
 * 第三方岗位板的展示名与条款要求（2026-10 核对）：全部「注明来源 + 链回原帖」，
 * 详情页 noindex、不进 sitemap、不输出 JobPosting 结构化数据（避免与原站重复收录 / 转投 Google Jobs）。
 * followLink：原站要求回链不带 nofollow（Remote OK API 条款）。
 */
export const SOURCE_POLICY: Record<OpportunitySource, { label: string; followLink: boolean }> = {
  greenhouse: { label: 'Greenhouse', followLink: true },
  lever: { label: 'Lever', followLink: true },
  ashby: { label: 'Ashby', followLink: true },
  remotive: { label: 'Remotive', followLink: true },
  vuejobs: { label: 'VueJobs', followLink: true },
  larajobs: { label: 'LaraJobs', followLink: true },
  weworkremotely: { label: 'We Work Remotely', followLink: true },
  remoteok: { label: 'Remote OK', followLink: true },
  himalayas: { label: 'Himalayas', followLink: true },
  jobicy: { label: 'Jobicy', followLink: true },
  golangprojects: { label: 'Golangprojects', followLink: true },
};

export function isIndexableSource(source: string): boolean {
  return (INDEXABLE_SOURCES as readonly string[]).includes(source);
}

export const JOB_CATEGORIES = [
  'engineering',
  'data',
  'design',
  'product',
  'devops',
  'security',
  'qa',
  'other',
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_KINDS = ['collected', 'community'] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export type OpportunityStatus = 'draft' | 'published' | 'expired';

/** 采集器产出、写入 CMS 的岗位（不含 CMS id）。 */
export type OpportunityInput = LocationRestrictions & {
  title: string;
  company: string;
  location: string;
  category: JobCategory;
  employmentType?: string;
  summary: string;
  descriptionMarkdown: string;
  applyUrl: string;
  source: OpportunitySource;
  sourceId: string;
  /** source:sourceId，CMS 唯一索引 */
  dedupeKey: string;
  /** company+title 归一化指纹，用于跨来源 / 和社区 JD 去重 */
  fingerprint: string;
  /** ISO 时间 */
  postedAt: string;
  status: OpportunityStatus;
  tags: string[];
};

export type Opportunity = OpportunityInput & {
  id: string;
  updatedAt: string;
};

/** 搜索 / 列表统一输出的一条岗位。 */
export type JobListing = LocationRestrictions & {
  /** 全局 id：`collected:<cmsId>` / `community:<uuid>` */
  id: string;
  kind: JobKind;
  title: string;
  company: string;
  location: string;
  category: JobCategory;
  source: string;
  url: string;
  summary: string;
  postedAt: string;
  /** 融合排序分（RRF），无 q 时为 null */
  score: number | null;
};

export type JobSearchFilters = {
  kind?: JobKind;
  workplace?: Workplace;
  /** 岗位覆盖的大区（办公地或允许的候选人所在区） */
  region?: LocationRegion;
  category?: JobCategory;
  /** 求职者所在国（ISO alpha-2）：排除不接受该国候选人的岗位 */
  country?: string;
  /** 求职者所在时区（UTC 偏移小时，可为 5.5）：排除时区不兼容的岗位 */
  utcOffset?: number;
};

export type JobFilterKey = keyof JobSearchFilters;
export const JOB_FILTER_KEYS: JobFilterKey[] = ['kind', 'workplace', 'region', 'category', 'country', 'utcOffset'];

export type JobSearchRequest = JobSearchFilters & {
  q?: string;
  /** 不要从 q 自动识别的过滤（用户在 UI 上删掉了自动识别的标签） */
  ignore?: JobFilterKey[];
  page?: number;
  pageSize?: number;
};

export type JobSearchResponse = {
  items: JobListing[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** hybrid：关键词+语义融合；keyword：仅关键词（向量不可用）；latest：无 q 按时间 */
  mode: 'hybrid' | 'keyword' | 'latest';
  /** 实际生效的过滤条件（含从 q 识别的） */
  filters: JobSearchFilters;
  /** filters 中哪些是从 q 自动识别出来的（UI 显示为可删除标签） */
  detected: JobFilterKey[];
};

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
