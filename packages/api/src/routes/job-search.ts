import {
  fetchCmsOpportunities,
  indexJobs,
  type JobSearchEnv,
  type Opportunity,
  type OpportunityCmsOptions,
} from '@muicv/shared';
import type { Context } from 'hono';

import type { CommunityJdRow } from '../lib/community-jd.ts';
import { searchPublishedJds } from '../lib/community-jd.ts';
import { communityIndexable, opportunityIndexable } from '../lib/job-index.ts';
import { type JobSearchDeps, parseSearchRequest, searchAllJobs } from '../lib/job-search.ts';
import { readJsonBody } from '../lib/json-body.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * GET|POST /jobs/search —— 统一岗位自然语言搜索（公开 API，给桌面端 / 扩展 / skill / website）。
 * 鉴权：optionalApiKey。带 key 走登录用户配额，匿名按 IP 走更低配额（Workers Rate Limiting）。
 * POST /jobs/search/reindex —— 运维回填向量，`x-reindex-token` 校验 JOBS_REINDEX_TOKEN。
 */

type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

type JobSearchBindings = {
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

function cmsOptions(env: JobSearchBindings): OpportunityCmsOptions {
  return env.MUICV_CMS_URL ? { baseUrl: env.MUICV_CMS_URL } : {};
}

async function communityByIds(db: D1Database, ids: string[]): Promise<CommunityJdRow[]> {
  const placeholders = ids.map(() => '?').join(',');
  const rows = await db
    .prepare(`SELECT * FROM communityJd WHERE status = 'published' AND id IN (${placeholders})`)
    .bind(...ids)
    .all<CommunityJdRow>();
  return rows.results ?? [];
}

export function buildDeps(env: JobSearchBindings): JobSearchDeps {
  const cms = cmsOptions(env);
  return {
    vector: vectorEnv(env),
    community: {
      byIds: (ids) => communityByIds(env.MUICV_API_DB, ids),
      search: (q, limit) => searchPublishedJds(env, { ...(q ? { q } : {}), limit: Math.min(limit, 50) }),
    },
    collected: {
      byIds: async (ids) => (await fetchCmsOpportunities({ ids, pageSize: ids.length }, cms)).docs,
      list: async (query) => (await fetchCmsOpportunities(query, cms)).docs,
    },
    log: console.warn,
  };
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

/** 社区 JD 入库后异步建向量；失败不影响贡献与积分。 */
export async function indexCommunityJdById(env: JobSearchBindings, id: string): Promise<void> {
  const vector = vectorEnv(env);
  if (!vector) return;
  const [row] = await communityByIds(env.MUICV_API_DB, [id]);
  if (row) await indexJobs(vector, [communityIndexable(row)]);
}

export async function handleJobsReindex(c: Context<AppEnv>): Promise<Response> {
  const env = bindings(c);
  const token = c.req.header('x-reindex-token');
  if (!env.JOBS_REINDEX_TOKEN || token !== env.JOBS_REINDEX_TOKEN) return c.json({ error: 'forbidden' }, 403);
  const vector = vectorEnv(env);
  if (!vector) return c.json({ error: 'vectorize-not-configured' }, 503);

  const parsed = await readJsonBody<{ kind?: unknown; page?: unknown }>(c);
  if (!parsed.ok) return parsed.response;
  const kind = parsed.body.kind === 'collected' ? 'collected' : 'community';
  const page = Math.max(Number(parsed.body.page) || 1, 1);
  const pageSize = 50;

  if (kind === 'community') {
    const rows = await env.MUICV_API_DB.prepare(
      `SELECT * FROM communityJd WHERE status = 'published' ORDER BY createdAt LIMIT ? OFFSET ?`,
    )
      .bind(pageSize, (page - 1) * pageSize)
      .all<CommunityJdRow>();
    const items = rows.results ?? [];
    const indexed = await indexJobs(vector, items.map(communityIndexable));
    return c.json({ kind, page, indexed, nextPage: items.length === pageSize ? page + 1 : null });
  }

  const result = await fetchCmsOpportunities({ page, pageSize }, cmsOptions(env));
  const docs: Opportunity[] = result.docs;
  const indexed = await indexJobs(vector, docs.map(opportunityIndexable));
  return c.json({ kind, page, indexed, nextPage: result.hasMore ? page + 1 : null });
}
