import type { RawJob } from '../normalize.ts';
import { asRecord, asString, type FetchLike, fetchJson } from './fetch-json.ts';

/**
 * Remotive 公开 API。条款要求：注明来源并链回 Remotive 原帖（applyUrl 即 Remotive url，
 * 前端展示「via Remotive」）；不得转投 Google Jobs 等，故详情页不输出 JobPosting 结构化数据、不进 sitemap。
 * 官方建议调用频率很低（每天几次），cron 每 6 小时一次满足。
 */
export async function fetchRemotive(fetchImpl: FetchLike, category: string): Promise<RawJob[]> {
  const body = asRecord(
    await fetchJson(fetchImpl, `https://remotive.com/api/remote-jobs?category=${category}&limit=100`),
  );
  const jobs = Array.isArray(body.jobs) ? body.jobs : [];
  return jobs.map((item) => {
    const j = asRecord(item);
    return {
      source: 'remotive',
      sourceId: asString(j.id),
      title: asString(j.title),
      company: asString(j.company_name),
      location: asString(j.candidate_required_location) || 'Remote',
      isRemote: true,
      workplace: 'remote',
      employmentType: asString(j.job_type) || undefined,
      html: asString(j.description),
      applyUrl: asString(j.url),
      postedAt: asString(j.publication_date),
      tags: Array.isArray(j.tags) ? j.tags.map(asString).filter(Boolean) : [],
    } satisfies RawJob;
  });
}
