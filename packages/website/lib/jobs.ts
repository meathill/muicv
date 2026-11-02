import {
  fetchAllCmsOpportunities,
  fetchCmsOpportunityById,
  INDEXABLE_SOURCES,
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

/** sitemap 数据与路由 ISR 对齐；不显式设置时 force-cache 会被 Next 当成约一年。 */
const CMS_REVALIDATE_SECONDS = 3600;

function cmsBaseOptions() {
  const baseUrl = process.env.MUICV_CMS_URL;
  return baseUrl ? { baseUrl } : {};
}

function sitemapCmsOptions() {
  return { ...cmsBaseOptions(), cache: 'force-cache' as const, revalidate: CMS_REVALIDATE_SECONDS };
}

export function getWebsiteOpportunity(id: string) {
  // 详情页必须实时反映下架状态；expired 也会返回，用于保留 200 存档页。
  return fetchCmsOpportunityById(id, { ...cmsBaseOptions(), cache: 'no-store' });
}

/** sitemap 用：全部在架的可收录岗位（Remotive 条款不允许转投搜索引擎，排除）。 */
export function getSitemapOpportunities() {
  return fetchAllCmsOpportunities({ pageSize: 500, onlySources: INDEXABLE_SOURCES }, sitemapCmsOptions());
}
