import type { JobSearchRequest, JobSearchResponse } from './types.ts';

/**
 * 客户端（桌面端 / 扩展 / skill / website）统一调用 `GET /jobs/search`。
 * 鉴权与其它端点一致：带 muicv API key 则 Bearer（更高速率），不带走匿名速率。
 */
export type JobSearchClientOptions = {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

export const DEFAULT_MUICV_API_BASE = 'https://api.muicv.com';

export function buildJobSearchQuery(req: JobSearchRequest): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of [
    'q',
    'kind',
    'workplace',
    'region',
    'category',
    'country',
    'utcOffset',
    'page',
    'pageSize',
  ] as const) {
    const value = req[key];
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  if (req.ignore?.length) params.set('ignore', req.ignore.join(','));
  return params;
}

export class JobSearchError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function searchJobs(
  req: JobSearchRequest,
  options: JobSearchClientOptions = {},
): Promise<JobSearchResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.baseUrl ?? DEFAULT_MUICV_API_BASE).replace(/\/+$/, '');
  const res = await fetchImpl(`${base}/jobs/search?${buildJobSearchQuery(req).toString()}`, {
    headers: {
      accept: 'application/json',
      ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new JobSearchError(res.status, body.error ?? `jobs/search 返回 ${res.status}`);
  }
  return (await res.json()) as JobSearchResponse;
}
