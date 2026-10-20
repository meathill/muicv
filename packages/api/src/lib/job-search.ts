import {
  classifyCategory,
  classifyRegion,
  classifyRemote,
  dedupeListings,
  extractFiltersFromQuery,
  isOneOf,
  JOB_CATEGORIES,
  JOB_KINDS,
  JOB_REGIONS,
  type JobListing,
  type JobSearchEnv,
  type JobSearchFilters,
  type JobSearchRequest,
  type JobSearchResponse,
  type Opportunity,
  type OpportunityListQuery,
  opportunityToListing,
  parseJobVectorId,
  queryJobVectors,
  REMOTE_TYPES,
  summarize,
} from '@muicv/shared';

import type { CommunityJdRow } from './community-jd.ts';

/**
 * 统一岗位搜索（采集岗位 + 社区 JD）。
 *
 * - 有 q 且有 AI/Vectorize：q → bge-m3 embedding → Vectorize topK（metadata 过滤）→ 回源 hydrate
 * - 向量不可用 / 无结果 / 报错：降级关键词（社区 FTS + CMS like）
 * - 无 q：按时间倒序
 * 结构化过滤 = 显式参数 ∪ 从 q 规则抽取（显式优先）。结果按 company+title / url 折叠去重。
 */

export const MAX_PAGE_SIZE = 50;
const VECTOR_TOP_K = 100;

export type JobSearchDeps = {
  vector: JobSearchEnv | null;
  community: {
    byIds(ids: string[]): Promise<CommunityJdRow[]>;
    search(q: string | undefined, limit: number): Promise<CommunityJdRow[]>;
  };
  collected: {
    byIds(ids: string[]): Promise<Opportunity[]>;
    list(query: OpportunityListQuery): Promise<Opportunity[]>;
  };
  log?: (message: string) => void;
};

export function parseSearchRequest(input: Record<string, unknown>): JobSearchRequest {
  const req: JobSearchRequest = {};
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 300) : '';
  if (q) req.q = q;
  if (isOneOf(JOB_KINDS, input.kind)) req.kind = input.kind;
  if (isOneOf(REMOTE_TYPES, input.remote)) req.remote = input.remote;
  if (isOneOf(JOB_REGIONS, input.region)) req.region = input.region;
  if (isOneOf(JOB_CATEGORIES, input.category)) req.category = input.category;
  const page = Number(input.page);
  const pageSize = Number(input.pageSize);
  req.page = Number.isInteger(page) && page > 0 ? Math.min(page, 20) : 1;
  req.pageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : 20;
  return req;
}

export function communityToListing(row: CommunityJdRow, score: number | null = null): JobListing {
  const title = row.title ?? '未命名岗位';
  const location = row.location ?? '';
  const category = classifyCategory(title);
  return {
    id: `community:${row.id}`,
    kind: 'community',
    title,
    company: row.company ?? '未知公司',
    location,
    remote: classifyRemote(`${location} ${title}`),
    region: classifyRegion(location),
    category,
    source: row.sourceSite,
    url: row.canonicalUrl,
    summary: summarize(row.markdown),
    postedAt: new Date(row.createdAt).toISOString(),
    score,
  };
}

function matchesFilters(item: JobListing, filters: JobSearchFilters): boolean {
  if (filters.kind && item.kind !== filters.kind) return false;
  if (filters.remote && item.remote !== filters.remote) return false;
  if (filters.region && item.region !== filters.region) return false;
  if (filters.category && item.category !== filters.category) return false;
  return true;
}

function paginate(items: JobListing[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), hasMore: items.length > start + pageSize };
}

async function vectorSearch(deps: JobSearchDeps, vector: JobSearchEnv, q: string, filters: JobSearchFilters) {
  const matches = await queryJobVectors(vector, q, filters, VECTOR_TOP_K);
  const refs = matches.flatMap((m) => {
    const ref = parseJobVectorId(m.id);
    return ref ? [{ ...ref, score: m.score }] : [];
  });
  if (refs.length === 0) return [];
  const communityIds = refs.filter((r) => r.kind === 'community').map((r) => r.refId);
  const collectedIds = refs.filter((r) => r.kind === 'collected').map((r) => r.refId);
  const [community, collected] = await Promise.all([
    communityIds.length ? deps.community.byIds(communityIds) : [],
    collectedIds.length ? deps.collected.byIds(collectedIds) : [],
  ]);
  const communityMap = new Map(community.map((row) => [row.id, row]));
  const collectedMap = new Map(collected.map((doc) => [doc.id, doc]));
  // 回源时已隐藏 / 过期的条目自然消失（向量索引允许短暂滞后）
  return refs.flatMap((ref) => {
    if (ref.kind === 'community') {
      const row = communityMap.get(ref.refId);
      return row ? [communityToListing(row, ref.score)] : [];
    }
    const doc = collectedMap.get(ref.refId);
    return doc ? [opportunityToListing(doc, ref.score)] : [];
  });
}

async function listSearch(deps: JobSearchDeps, q: string | undefined, filters: JobSearchFilters, want: number) {
  // 社区 JD 没有结构化列：多取一些再按规则分类过滤
  const [community, collected] = await Promise.all([
    filters.kind === 'collected' ? [] : deps.community.search(q, Math.min(want * 2, 100)),
    filters.kind === 'community'
      ? []
      : deps.collected.list({
          ...(q ? { keyword: q } : {}),
          ...(filters.remote ? { remote: filters.remote } : {}),
          ...(filters.region ? { region: filters.region } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          pageSize: want,
        }),
  ]);
  return [...collected.map((doc) => opportunityToListing(doc)), ...community.map((row) => communityToListing(row))]
    .filter((item) => matchesFilters(item, filters))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export async function searchAllJobs(deps: JobSearchDeps, req: JobSearchRequest): Promise<JobSearchResponse> {
  const page = req.page ?? 1;
  const pageSize = req.pageSize ?? 20;
  const explicit: JobSearchFilters = {
    ...(req.kind ? { kind: req.kind } : {}),
    ...(req.remote ? { remote: req.remote } : {}),
    ...(req.region ? { region: req.region } : {}),
    ...(req.category ? { category: req.category } : {}),
  };
  const filters: JobSearchFilters = req.q ? { ...extractFiltersFromQuery(req.q), ...explicit } : explicit;
  const want = page * pageSize + 1;

  if (req.q && deps.vector) {
    try {
      const items = dedupeListings(await vectorSearch(deps, deps.vector, req.q, filters));
      if (items.length > 0) return { ...paginate(items, page, pageSize), page, pageSize, mode: 'vector', filters };
    } catch (error) {
      deps.log?.(`[jobs/search] vector 降级: ${String(error)}`);
    }
  }

  if (req.q) {
    let items = dedupeListings(await listSearch(deps, req.q, filters, want));
    // 自然语言整句做 LIKE 基本命不中：有抽到过滤条件就退化为「按条件看最新」
    if (items.length === 0 && Object.keys(filters).length > Object.keys(explicit).length) {
      items = dedupeListings(await listSearch(deps, undefined, filters, want));
    }
    return { ...paginate(items, page, pageSize), page, pageSize, mode: 'keyword', filters };
  }

  const items = dedupeListings(await listSearch(deps, undefined, filters, want));
  return { ...paginate(items, page, pageSize), page, pageSize, mode: 'latest', filters };
}
