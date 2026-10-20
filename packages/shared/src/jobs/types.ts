/**
 * 统一岗位频道（/jobs）的领域类型。
 *
 * 两路来源合并展示、统一检索：
 * - collected：cron 从 Greenhouse / Lever / Ashby / Remotive 公开接口采集，存 CMS `opportunities`
 * - community：用户用浏览器扩展贡献的 JD，存 api D1 `communityJd`（贡献奖励积分）
 */

export const OPPORTUNITY_SOURCES = ['greenhouse', 'lever', 'ashby', 'remotive'] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

export const REMOTE_TYPES = ['remote', 'hybrid', 'onsite'] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

export const JOB_REGIONS = ['global', 'americas', 'europe', 'apac', 'other'] as const;
export type JobRegion = (typeof JOB_REGIONS)[number];

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
export type OpportunityInput = {
  title: string;
  company: string;
  location: string;
  remote: RemoteType;
  region: JobRegion;
  category: JobCategory;
  employmentType?: string;
  summary: string;
  descriptionMarkdown: string;
  applyUrl: string;
  source: OpportunitySource;
  sourceId: string;
  /** source:sourceId，CMS 唯一索引 */
  dedupeKey: string;
  /** company+title+url 归一化指纹，用于和社区 JD 去重 */
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
export type JobListing = {
  /** 全局 id：`collected:<cmsId>` / `community:<uuid>` */
  id: string;
  kind: JobKind;
  title: string;
  company: string;
  location: string;
  remote: RemoteType | null;
  region: JobRegion | null;
  category: JobCategory | null;
  source: string;
  url: string;
  summary: string;
  postedAt: string;
  /** 向量相似度（0-1），关键词检索时为 null */
  score: number | null;
};

export type JobSearchFilters = {
  kind?: JobKind;
  remote?: RemoteType;
  region?: JobRegion;
  category?: JobCategory;
};

export type JobSearchRequest = JobSearchFilters & {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type JobSearchResponse = {
  items: JobListing[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** vector：语义检索；keyword：降级到关键词；latest：无 q 按时间 */
  mode: 'vector' | 'keyword' | 'latest';
  /** 实际生效的过滤条件（含从 q 解析出的） */
  filters: JobSearchFilters;
};

export function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}
