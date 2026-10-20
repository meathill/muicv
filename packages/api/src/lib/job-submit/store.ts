import {
  canonicalizeUrl,
  describeRestrictions,
  type JobSubmitVisibility,
  jobFingerprint,
  jobUrlKey,
  parseLocationRestrictions,
  type SubmittedJob,
  sha256Hex,
  siteIdForHost,
} from '@muicv/shared';

import type { CandidateJob } from './types.ts';

/**
 * 入库：public → communityJd（与 jobIndex / CMS 镜像 / 社区去重）+ 索引回调；private → savedJob（只属于本人）。
 * 单条失败不影响其它条，状态记为 failed。
 */

export const JOB_SITE_BASE = 'https://muicv.com/jobs';

export type StoreEnv = { MUICV_API_DB: D1Database };

export type StoreContext = {
  userId: string;
  submissionId: string;
  pageUrl: string;
  /** 多个岗位共用页面 URL 时，按指纹区分 urlHash */
  sharedPageUrl: boolean;
  /** 新公共岗位入库后同步 jobIndex + 向量；失败只记日志 */
  index: (communityId: string) => Promise<void>;
  now: number;
};

function composeMarkdown(job: CandidateJob): string {
  const meta = [job.company, job.location, job.employmentType].filter(Boolean).join(' · ');
  return `# ${job.title}\n\n${meta ? `${meta}\n\n` : ''}${job.body.trim()}\n\n原帖：${job.url}`.trim();
}

function restrictionsOf(job: CandidateJob) {
  return parseLocationRestrictions({
    locations: job.location ? [job.location] : [],
    workplaceHint: job.workplaceHint,
    body: job.body,
    title: job.title,
  });
}

async function urlHashOf(job: CandidateJob, ctx: StoreContext): Promise<{ canonicalUrl: string; urlHash: string }> {
  const canonicalUrl = canonicalizeUrl(job.url);
  const shared = ctx.sharedPageUrl && jobUrlKey(job.url) === jobUrlKey(ctx.pageUrl);
  const key = shared ? `${canonicalUrl}#${jobFingerprint(job.company, job.title)}` : canonicalUrl;
  return { canonicalUrl, urlHash: await sha256Hex(key) };
}

function summary(job: CandidateJob, status: SubmittedJob['status'], link: string | null): SubmittedJob {
  const r = restrictionsOf(job);
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    workplace: r.workplace,
    url: job.url,
    status,
    link,
    restrictions: describeRestrictions(r),
  };
}

async function findPublicDuplicate(
  env: StoreEnv,
  job: CandidateJob,
  urlHash: string,
  contentHash: string,
): Promise<string | null> {
  const community = await env.MUICV_API_DB.prepare(
    'SELECT id FROM communityJd WHERE urlHash = ? OR contentHash = ? LIMIT 1',
  )
    .bind(urlHash, contentHash)
    .first<{ id: string }>();
  if (community) return `${JOB_SITE_BASE}/${community.id}`;
  const indexed = await env.MUICV_API_DB.prepare(
    `SELECT kind, refId FROM jobIndex WHERE status = 'published' AND (urlKey = ? OR fingerprint = ?) LIMIT 1`,
  )
    .bind(jobUrlKey(job.url), jobFingerprint(job.company, job.title))
    .first<{ kind: string; refId: string }>()
    .catch(() => null);
  if (!indexed) return null;
  return indexed.kind === 'community' ? `${JOB_SITE_BASE}/${indexed.refId}` : `${JOB_SITE_BASE}/o/${indexed.refId}`;
}

async function storePublic(env: StoreEnv, job: CandidateJob, ctx: StoreContext): Promise<SubmittedJob> {
  const markdown = composeMarkdown(job);
  const { canonicalUrl, urlHash } = await urlHashOf(job, ctx);
  const contentHash = await sha256Hex(markdown.replace(/\s+/g, ' ').trim());
  const dup = await findPublicDuplicate(env, job, urlHash, contentHash);
  if (dup) return summary(job, 'duplicate', dup);

  const id = crypto.randomUUID();
  const inserted = await env.MUICV_API_DB.prepare(
    `INSERT INTO communityJd (id, canonicalUrl, urlHash, contentHash, sourceSite, title, company, location, employmentType, markdown, contributorUserId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
     ON CONFLICT(urlHash) DO NOTHING RETURNING id`,
  )
    .bind(
      id,
      canonicalUrl,
      urlHash,
      contentHash,
      siteIdForHost(new URL(canonicalUrl).hostname),
      job.title,
      job.company,
      job.location || null,
      job.employmentType ?? null,
      markdown,
      ctx.userId,
      ctx.now,
      ctx.now,
    )
    .first<{ id: string }>();
  // 并发提交同一链接：另一请求先入库，本条按重复处理
  if (!inserted) return summary(job, 'duplicate', null);
  await ctx.index(id).catch((err: unknown) => console.warn('[job-submit] index failed', id, err));
  return summary(job, 'new', `${JOB_SITE_BASE}/${id}`);
}

async function storePrivate(env: StoreEnv, job: CandidateJob, ctx: StoreContext): Promise<SubmittedJob> {
  const { urlHash } = await urlHashOf(job, ctx);
  const r = restrictionsOf(job);
  const restrictions = JSON.stringify({
    allowedCountries: r.allowedCountries,
    allowedRegions: r.allowedRegions,
    utcOffsetMin: r.utcOffsetMin,
    utcOffsetMax: r.utcOffsetMax,
    officeLocations: r.officeLocations,
  });
  const existing = await env.MUICV_API_DB.prepare('SELECT id FROM savedJob WHERE userId = ? AND urlHash = ? LIMIT 1')
    .bind(ctx.userId, urlHash)
    .first<{ id: string }>();
  await env.MUICV_API_DB.prepare(
    `INSERT INTO savedJob (id, userId, submissionId, url, urlHash, title, company, location, workplace, restrictions, markdown, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId, urlHash) DO UPDATE SET submissionId = excluded.submissionId, title = excluded.title,
       company = excluded.company, location = excluded.location, workplace = excluded.workplace,
       restrictions = excluded.restrictions, markdown = excluded.markdown, updatedAt = excluded.updatedAt`,
  )
    .bind(
      existing?.id ?? crypto.randomUUID(),
      ctx.userId,
      ctx.submissionId,
      job.url,
      urlHash,
      job.title,
      job.company,
      job.location,
      r.workplace,
      restrictions,
      composeMarkdown(job),
      ctx.now,
      ctx.now,
    )
    .run();
  return summary(job, existing ? 'duplicate' : 'new', null);
}

export async function storeJobs(
  env: StoreEnv,
  jobs: CandidateJob[],
  visibility: JobSubmitVisibility,
  ctx: StoreContext,
): Promise<SubmittedJob[]> {
  const out: SubmittedJob[] = [];
  for (const job of jobs) {
    if (!job.title || !job.company) {
      out.push(summary({ ...job, company: job.company || '未知公司' }, 'failed', null));
      continue;
    }
    try {
      out.push(visibility === 'public' ? await storePublic(env, job, ctx) : await storePrivate(env, job, ctx));
    } catch (err) {
      console.warn('[job-submit] store failed', job.url, err);
      out.push(summary(job, 'failed', null));
    }
  }
  return out;
}
