import {
  fetchCmsOpportunities,
  fetchCmsOpportunityById,
  type JobSearchRequest,
  type JobSearchResponse,
  searchJobs,
} from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { headers } from 'next/headers';

/**
 * /jobs 统一岗位频道的数据入口：列表 / 搜索统一走 api `/jobs/search`（与桌面端同一套逻辑），
 * 采集岗位详情直读 CMS。
 */

type ServiceFetcher = { fetch: typeof fetch };

async function apiFetch(): Promise<typeof fetch> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as unknown as { MUICV_API?: ServiceFetcher }).MUICV_API;
    if (binding) return (input, init) => binding.fetch(input, init);
  } catch {
    /* 本地 next dev 无 Cloudflare context，走公网 */
  }
  return fetch;
}

export async function searchWebsiteJobs(req: JobSearchRequest): Promise<JobSearchResponse | null> {
  const fetchImpl = await apiFetch();
  // service binding 请求没有 cf-connecting-ip，把访客 IP 透传给 api 做匿名限流
  const clientIp = (await headers()).get('cf-connecting-ip') ?? '';
  try {
    return await searchJobs(req, {
      baseUrl: process.env.MUICV_API_URL ?? 'https://api.muicv.com',
      fetchImpl: (input, init) =>
        fetchImpl(input, { ...init, headers: { ...(init?.headers ?? {}), 'x-muicv-client-ip': clientIp } }),
    });
  } catch {
    return null;
  }
}

function cmsOptions() {
  const baseUrl = process.env.MUICV_CMS_URL;
  return baseUrl ? { baseUrl, cache: 'force-cache' as const } : { cache: 'force-cache' as const };
}

export function getWebsiteOpportunity(id: string) {
  return fetchCmsOpportunityById(id, { ...cmsOptions(), cache: 'no-store' });
}

/** sitemap 用：最新的采集岗位（Remotive 条款不允许转投搜索引擎，排除）。 */
export async function getSitemapOpportunities() {
  const page = await fetchCmsOpportunities({ pageSize: 500 }, cmsOptions());
  return page.docs.filter((doc) => doc.source !== 'remotive');
}
