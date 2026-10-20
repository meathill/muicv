import {
  buildFilterSql,
  buildFtsPlan,
  dedupeListings,
  detectQueryFilters,
  isCountryCode,
  isOneOf,
  JOB_CATEGORIES,
  JOB_FILTER_KEYS,
  JOB_KINDS,
  type JobFilterKey,
  type JobIndexRow,
  type JobSearchEnv,
  type JobSearchFilters,
  type JobSearchRequest,
  type JobSearchResponse,
  LOCATION_REGIONS,
  queryJobVectors,
  reciprocalRankFusion,
  rowToListing,
  type SqlDatabase,
  WORKPLACES,
} from '@muicv/shared';

/**
 * 统一岗位混合检索（采集岗位 + 社区 JD，全部在 D1 jobIndex）。
 *
 * q 存在时三路召回，各自都带同一套结构化 WHERE（硬约束）：
 *   1. FTS5 trigram（bm25）：中英文模糊 / 拼写容错
 *   2. LIKE：< 3 字符的短词（「前端」「Go」trigram 匹配不了）
 *   3. 语义：bge-m3 → Vectorize topK（kind/workplace/category 下推 metadata）→ 回 D1 按 WHERE 复核
 * 然后 RRF 融合 → 按 company+title / url 折叠 → 分页。无 q 时按 postedAt 倒序。
 */

export const MAX_PAGE_SIZE = 50;
const RECALL_LIMIT = 100;

export type JobSearchDeps = {
  db: SqlDatabase;
  vector: JobSearchEnv | null;
  log?: (message: string) => void;
};

export function parseSearchRequest(input: Record<string, unknown>): JobSearchRequest {
  const req: JobSearchRequest = {};
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 300) : '';
  if (q) req.q = q;
  if (isOneOf(JOB_KINDS, input.kind)) req.kind = input.kind;
  // 兼容早期参数名 remote=remote|hybrid|onsite
  const workplace = input.workplace ?? input.remote;
  if (isOneOf(WORKPLACES, workplace)) req.workplace = workplace;
  if (isOneOf(LOCATION_REGIONS, input.region)) req.region = input.region;
  if (isOneOf(JOB_CATEGORIES, input.category)) req.category = input.category;
  if (isCountryCode(input.country)) req.country = input.country.toUpperCase();
  const utc = Number(input.utcOffset);
  if (input.utcOffset !== undefined && input.utcOffset !== '' && Number.isFinite(utc) && utc >= -12 && utc <= 14) {
    req.utcOffset = utc;
  }
  const ignoreRaw = Array.isArray(input.ignore) ? input.ignore.join(',') : String(input.ignore ?? '');
  const ignore = ignoreRaw.split(',').filter((k): k is JobFilterKey => (JOB_FILTER_KEYS as string[]).includes(k));
  if (ignore.length) req.ignore = ignore;
  const page = Number(input.page);
  const pageSize = Number(input.pageSize);
  req.page = Number.isInteger(page) && page > 0 ? Math.min(page, 20) : 1;
  req.pageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : 20;
  return req;
}

/** 显式参数优先；q 里识别出的过滤只补充显式没给、且未被 ignore 的键。 */
export function resolveFilters(req: JobSearchRequest): {
  filters: JobSearchFilters;
  detected: JobFilterKey[];
  residual: string;
} {
  const explicit: JobSearchFilters = {};
  for (const key of JOB_FILTER_KEYS) {
    if (req[key] !== undefined) Object.assign(explicit, { [key]: req[key] });
  }
  if (!req.q) return { filters: explicit, detected: [], residual: '' };
  const { filters: auto, residual } = detectQueryFilters(req.q);
  const detected: JobFilterKey[] = [];
  const filters = { ...explicit };
  for (const key of JOB_FILTER_KEYS) {
    if (auto[key] === undefined || explicit[key] !== undefined || req.ignore?.includes(key)) continue;
    Object.assign(filters, { [key]: auto[key] });
    detected.push(key);
  }
  return { filters, detected, residual };
}

async function ftsRecall(db: SqlDatabase, text: string, filters: JobSearchFilters): Promise<JobIndexRow[]> {
  const plan = buildFtsPlan(text);
  if (!plan.match) return [];
  const { where, params } = buildFilterSql(filters);
  const res = await db
    .prepare(
      `SELECT j.* FROM jobIndexFts f JOIN jobIndex j ON j.rowid = f.rowid
       WHERE jobIndexFts MATCH ? AND ${where}
       ORDER BY bm25(jobIndexFts, 10.0, 6.0, 2.0, 1.0) LIMIT ?`,
    )
    .bind(plan.match, ...params, RECALL_LIMIT)
    .all<JobIndexRow>();
  return res.results ?? [];
}

async function likeRecall(db: SqlDatabase, text: string, filters: JobSearchFilters): Promise<JobIndexRow[]> {
  const { shortTerms } = buildFtsPlan(text);
  if (shortTerms.length === 0) return [];
  const { where, params } = buildFilterSql(filters);
  const likes = shortTerms.map(() => '(j.title LIKE ? OR j.company LIKE ? OR j.body LIKE ?)');
  const likeParams = shortTerms.flatMap((t) => [`%${t}%`, `%${t}%`, `%${t}%`]);
  const res = await db
    .prepare(`SELECT j.* FROM jobIndex j WHERE ${where} AND (${likes.join(' OR ')}) ORDER BY j.postedAt DESC LIMIT ?`)
    .bind(...params, ...likeParams, RECALL_LIMIT)
    .all<JobIndexRow>();
  return res.results ?? [];
}

async function vectorRecall(
  db: SqlDatabase,
  vector: JobSearchEnv,
  text: string,
  filters: JobSearchFilters,
): Promise<JobIndexRow[]> {
  const matches = await queryJobVectors(vector, text, filters, RECALL_LIMIT);
  if (matches.length === 0) return [];
  const ids = matches.map((m) => m.id);
  const { where, params } = buildFilterSql(filters);
  const res = await db
    // D1 单条语句最多 100 个绑定参数：id 列表走 json_each 只占 1 个
    .prepare(`SELECT j.* FROM jobIndex j WHERE j.id IN (SELECT value FROM json_each(?)) AND ${where}`)
    .bind(JSON.stringify(ids), ...params)
    .all<JobIndexRow>();
  const byId = new Map((res.results ?? []).map((r) => [r.id, r]));
  // 保持向量相似度顺序；已下线 / 不满足硬约束的自然被丢掉
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

async function latest(db: SqlDatabase, filters: JobSearchFilters, page: number, pageSize: number) {
  const { where, params } = buildFilterSql(filters);
  const res = await db
    .prepare(`SELECT j.* FROM jobIndex j WHERE ${where} ORDER BY j.postedAt DESC LIMIT ? OFFSET ?`)
    .bind(...params, pageSize * 2 + 1, (page - 1) * pageSize)
    .all<JobIndexRow>();
  const items = dedupeListings((res.results ?? []).map((row) => rowToListing(row)));
  return { items: items.slice(0, pageSize), hasMore: (res.results ?? []).length > pageSize };
}

export async function searchAllJobs(deps: JobSearchDeps, req: JobSearchRequest): Promise<JobSearchResponse> {
  const page = req.page ?? 1;
  const pageSize = req.pageSize ?? 20;
  const { filters, detected, residual } = resolveFilters(req);
  const base = { page, pageSize, filters, detected };

  // q 全是过滤短语（「我在中国 远程」）时，等价于按条件看最新
  if (!req.q || !residual) {
    return { ...base, ...(await latest(deps.db, filters, page, pageSize)), mode: 'latest' };
  }

  let vectorRows: JobIndexRow[] = [];
  let vectorOk = false;
  const keywordTask = Promise.all([ftsRecall(deps.db, residual, filters), likeRecall(deps.db, residual, filters)]);
  if (deps.vector) {
    try {
      vectorRows = await vectorRecall(deps.db, deps.vector, residual, filters);
      vectorOk = true;
    } catch (error) {
      deps.log?.(`[jobs/search] 语义检索降级: ${String(error)}`);
    }
  }
  const [ftsRows, likeRows] = await keywordTask;

  const rows = new Map<string, JobIndexRow>();
  for (const row of [...ftsRows, ...likeRows, ...vectorRows]) rows.set(row.id, row);
  const fused = reciprocalRankFusion([ftsRows, likeRows, vectorRows].map((list) => list.map((r) => r.id)));
  const listings = dedupeListings(
    fused.flatMap(({ id, score }) => {
      const row = rows.get(id);
      return row ? [rowToListing(row, Number(score.toFixed(5)))] : [];
    }),
  );
  const start = (page - 1) * pageSize;
  return {
    ...base,
    items: listings.slice(start, start + pageSize),
    hasMore: listings.length > start + pageSize,
    mode: vectorOk ? 'hybrid' : 'keyword',
  };
}
