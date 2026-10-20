import {
  communityToIndexRow,
  fetchCmsOpportunities,
  indexJobs,
  indexRowToIndexable,
  type JobSearchEnv,
  opportunityToIndexRow,
  type SqlDatabase,
  upsertJobIndexRows,
} from '@muicv/shared';
import type { Context } from 'hono';

import type { CommunityJdRow } from '../lib/community-jd.ts';
import { type JobSearchDeps, parseSearchRequest, searchAllJobs } from '../lib/job-search.ts';
import { readJsonBody } from '../lib/json-body.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * GET|POST /jobs/search —— 统一岗位混合检索（公开 API，给桌面端 / 扩展 / skill / website）。
 * 鉴权：optionalApiKey。带 key 按 userId 限流，匿名按 IP（Workers Rate Limiting）。
 * POST /jobs/search/reindex —— 运维回填 jobIndex + 向量，`x-reindex-token` 校验 JOBS_REINDEX_TOKEN。
 */

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

export type JobSearchBindings = {
  AI?: JobSearchEnv['AI'];
  JOBS_INDEX?: JobSearchEnv['JOBS_INDEX'];
  JOBS_SEARCH_LIMITER?: RateLimiter;
  JOBS_SEARCH_ANON_LIMITER?: RateLimiter;
  JOBS_REINDEX_TOKEN?: string;
  MUICV_CMS_URL?: string;
  MUICV_API_DB: D1Database;
};

function bindings(c: Context<AppEnv>): JobSearchBindings {
  return c.env as unknown as JobSearchBindings;
}

export function vectorEnv(env: JobSearchBindings): JobSearchEnv | null {
  return env.AI && env.JOBS_INDEX ? { AI: env.AI, JOBS_INDEX: env.JOBS_INDEX } : null;
}

function sqlDb(env: JobSearchBindings): SqlDatabase {
  return env.MUICV_API_DB as unknown as SqlDatabase;
}

export function buildDeps(env: JobSearchBindings): JobSearchDeps {
  return { db: sqlDb(env), vector: vectorEnv(env), log: console.warn };
}

async function checkRateLimit(c: Context<AppEnv>): Promise<Response | null> {
  const env = bindings(c);
  const userId = c.get('userId');
  const limiter = userId ? env.JOBS_SEARCH_LIMITER : env.JOBS_SEARCH_ANON_LIMITER;
  if (!limiter) return null;
  // 公网请求一定带 cf-connecting-ip（Cloudflare 注入，客户端无法伪造）；没有它说明来自 service
  // binding（website），此时才信任 website 透传的访客 IP。
  const key = userId ?? c.req.header('cf-connecting-ip') ?? `web:${c.req.header('x-muicv-client-ip') || 'unknown'}`;
  const { success } = await limiter.limit({ key });
  return success ? null : c.json({ error: '搜索太频繁，请稍后再试（登录并配置 API key 可获得更高额度）' }, 429);
}

export async function handleJobsSearch(c: Context<AppEnv>): Promise<Response> {
  const limited = await checkRateLimit(c);
  if (limited) return limited;

  let input: Record<string, unknown> = c.req.query();
  if (c.req.method === 'POST') {
    const parsed = await readJsonBody<Record<string, unknown>>(c);
    if (!parsed.ok) return parsed.response;
    input = parsed.body;
  }
  const result = await searchAllJobs(buildDeps(bindings(c)), parseSearchRequest(input));
  c.header('cache-control', 'public, max-age=60');
  return c.json(result);
}

/** 社区 JD 入库后同步进 jobIndex 并建向量；失败不影响贡献与积分。 */
export async function indexCommunityJdById(env: JobSearchBindings, id: string): Promise<void> {
  const row = await env.MUICV_API_DB.prepare(`SELECT * FROM communityJd WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<CommunityJdRow>();
  if (!row) return;
  const indexRow = communityToIndexRow(row);
  await upsertJobIndexRows(sqlDb(env), [indexRow]);
  const vector = vectorEnv(env);
  if (vector && row.status === 'published') await indexJobs(vector, [indexRowToIndexable(indexRow)]);
}

/** 常量时间比较，避免按响应时间逐字节猜 token */
function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function handleJobsReindex(c: Context<AppEnv>): Promise<Response> {
  const env = bindings(c);
  const token = c.req.header('x-reindex-token');
  if (!env.JOBS_REINDEX_TOKEN || !token || !safeEqual(token, env.JOBS_REINDEX_TOKEN)) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const parsed = await readJsonBody<{ kind?: unknown; page?: unknown }>(c);
  if (!parsed.ok) return parsed.response;
  const kind = parsed.body.kind === 'collected' ? 'collected' : 'community';
  const page = Math.max(Number(parsed.body.page) || 1, 1);
  const pageSize = 50;
  const vector = vectorEnv(env);

  let rows: ReturnType<typeof communityToIndexRow>[];
  let nextPage: number | null;
  if (kind === 'community') {
    const res = await env.MUICV_API_DB.prepare(`SELECT * FROM communityJd ORDER BY createdAt LIMIT ? OFFSET ?`)
      .bind(pageSize, (page - 1) * pageSize)
      .all<CommunityJdRow>();
    const items = res.results ?? [];
    rows = items.map((jd) => communityToIndexRow(jd));
    nextPage = items.length === pageSize ? page + 1 : null;
  } else {
    const result = await fetchCmsOpportunities(
      { page, pageSize },
      env.MUICV_CMS_URL ? { baseUrl: env.MUICV_CMS_URL } : {},
    );
    rows = result.docs.map((doc) => opportunityToIndexRow(doc));
    nextPage = result.hasMore ? page + 1 : null;
  }
  await upsertJobIndexRows(sqlDb(env), rows);
  const indexed = vector
    ? await indexJobs(vector, rows.filter((r) => r.status === 'published').map(indexRowToIndexable))
    : 0;
  return c.json({ kind, page, upserted: rows.length, indexed, nextPage });
}
