import {
  htmlToText,
  JOB_SUBMIT_LINK_TEXT_CAP,
  JOB_SUBMIT_MAX_FOLLOW,
  JOB_SUBMIT_MAX_JOBS,
  type JobSubmitMethod,
  type JobSubmitRequest,
  jobUrlKey,
} from '@muicv/shared';

import { type AiJob, analyzePage } from './ai.ts';
import { detectAtsUrl, fetchAtsJob } from './ats.ts';
import { jobsFromJsonLd, jsonLdFromHtml } from './jsonld.ts';
import type { LinkFetcher } from './link-cache.ts';
import { toPublicUrl } from './safe-fetch.ts';
import type { AiUsage, CandidateJob, TextAi } from './types.ts';

/**
 * 识别流水线：JSON-LD → 已知 ATS → Workers AI 判别 + 抽取 → 跟进 ≤3 条详情链接。
 * 只产出候选岗位与 AI 用量；入库与计费由调用方处理。
 */

export type PipelineDeps = { ai: TextAi | null; fetchLink: LinkFetcher };

export type PipelineResult = { method: JobSubmitMethod; jobs: CandidateJob[]; usage: AiUsage; note?: string };

function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}

function withPageBody(jobs: CandidateJob[], req: JobSubmitRequest): CandidateJob[] {
  return jobs
    .slice(0, JOB_SUBMIT_MAX_JOBS)
    .map((job) => (job.body || jobs.length > 1 ? job : { ...job, body: req.markdown }));
}

/** AI 给的链接必须出自页面外链（或就是页面本身），防止模型被页面内容诱导去抓任意地址。 */
function allowedUrl(raw: string, req: JobSubmitRequest): string | null {
  if (!raw) return null;
  const key = jobUrlKey(raw);
  const known = req.links.find((l) => jobUrlKey(l.url) === key)?.url ?? (jobUrlKey(req.url) === key ? req.url : null);
  return known && toPublicUrl(known) ? known : null;
}

function fromAiJob(job: AiJob, url: string, body: string): CandidateJob {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    workplaceHint: job.workplace === 'unknown' ? undefined : job.workplace,
    url,
    body,
  };
}

async function followLink(
  deps: PipelineDeps,
  ai: TextAi,
  url: string,
  hint: AiJob,
): Promise<{ job: CandidateJob | null; usage: AiUsage }> {
  const none = { inputTokens: 0, outputTokens: 0 };
  const ats = detectAtsUrl(url);
  if (ats) {
    const job = await fetchAtsJob(deps.fetchLink, ats).catch(() => null);
    if (job) return { job, usage: none };
  }
  const res = await deps.fetchLink(url);
  if (res.status !== 200 || !res.body) return { job: null, usage: none };
  const [structured] = jobsFromJsonLd(jsonLdFromHtml(res.body), res.finalUrl);
  if (structured) return { job: { ...structured, company: structured.company || hint.company }, usage: none };
  const text = htmlToText(res.body).slice(0, JOB_SUBMIT_LINK_TEXT_CAP);
  if (text.length < 80) return { job: null, usage: none };
  const detail = await analyzePage(ai, { url, title: hint.title, text, links: [] });
  const [first] = detail.jobs;
  if (!first) return { job: null, usage: detail.usage };
  const merged: AiJob = { ...hint, ...Object.fromEntries(Object.entries(first).filter(([, v]) => v)) };
  return { job: fromAiJob(merged, url, text), usage: detail.usage };
}

/** 免费的确定性识别（JSON-LD / 已知 ATS），足够快，可在请求内同步完成；没命中返回 null。 */
export async function runDeterministic(deps: PipelineDeps, req: JobSubmitRequest): Promise<PipelineResult | null> {
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  const structured = jobsFromJsonLd(req.jsonLd, req.url);
  if (structured.length > 0) return { method: 'jsonld', jobs: withPageBody(structured, req), usage };
  const ats = detectAtsUrl(req.url);
  if (ats) {
    const job = await fetchAtsJob(deps.fetchLink, ats).catch(() => null);
    if (job) return { method: 'ats', jobs: [job], usage };
  }
  return null;
}

export async function runSubmitPipeline(deps: PipelineDeps, req: JobSubmitRequest): Promise<PipelineResult> {
  const quick = await runDeterministic(deps, req);
  if (quick) return quick;
  let usage: AiUsage = { inputTokens: 0, outputTokens: 0 };

  if (!deps.ai) return { method: 'none', jobs: [], usage, note: 'AI 识别暂不可用，且页面没有结构化岗位数据' };
  const page = await analyzePage(deps.ai, { url: req.url, title: req.title, text: req.markdown, links: req.links });
  usage = addUsage(usage, page.usage);
  if (!page.hasJobs) return { method: 'none', jobs: [], usage, note: '这一页没有识别到明确的岗位信息' };

  const pageKey = jobUrlKey(req.url);
  const jobs: CandidateJob[] = [];
  let followed = 0;
  for (const hint of page.jobs) {
    const url = allowedUrl(hint.url, req);
    const isDetail = url !== null && jobUrlKey(url) !== pageKey;
    if (isDetail && followed < JOB_SUBMIT_MAX_FOLLOW) {
      followed++;
      const res = await followLink(deps, deps.ai, url, hint).catch(() => ({
        job: null,
        usage: { inputTokens: 0, outputTokens: 0 },
      }));
      usage = addUsage(usage, res.usage);
      if (res.job) {
        jobs.push(res.job);
        continue;
      }
    }
    const single = page.jobs.length === 1 && !isDetail;
    jobs.push(fromAiJob(hint, url ?? req.url, single ? req.markdown : hint.summary));
  }
  return { method: 'ai', jobs: jobs.slice(0, JOB_SUBMIT_MAX_JOBS), usage };
}
