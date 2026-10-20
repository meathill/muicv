import {
  isOneOf,
  JOB_CATEGORIES,
  JOB_REGIONS,
  type JobListing,
  type JobSearchFilters,
  OPPORTUNITY_SOURCES,
  type Opportunity,
  REMOTE_TYPES,
} from './types.ts';

/** 读 CMS `opportunities`（公开 REST，匿名只能读 published）。 */

const DEFAULT_CMS_BASE_URL = 'https://cms.muicv.com';

export type OpportunityCmsOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: 'default' | 'force-cache' | 'no-store';
};

export type OpportunityListQuery = JobSearchFilters & {
  keyword?: string;
  ids?: string[];
  page?: number;
  pageSize?: number;
};

export type OpportunityPage = { docs: Opportunity[]; hasMore: boolean };

export function buildOpportunityParams(query: OpportunityListQuery): URLSearchParams {
  const params = new URLSearchParams({
    depth: '0',
    limit: String(query.pageSize ?? 20),
    page: String(query.page ?? 1),
    sort: '-postedAt',
    'where[status][equals]': 'published',
  });
  if (query.remote) params.set('where[remote][equals]', query.remote);
  if (query.region) params.set('where[region][equals]', query.region);
  if (query.category) params.set('where[category][equals]', query.category);
  if (query.ids) params.set('where[id][in]', query.ids.join(','));
  const keyword = query.keyword?.trim();
  if (keyword) {
    params.set('where[or][0][title][like]', keyword);
    params.set('where[or][1][company][like]', keyword);
    params.set('where[or][2][descriptionMarkdown][like]', keyword);
  }
  return params;
}

export async function fetchCmsOpportunities(
  query: OpportunityListQuery,
  options: OpportunityCmsOptions = {},
): Promise<OpportunityPage> {
  const body = await fetchJson(`/api/opportunities?${buildOpportunityParams(query).toString()}`, options);
  if (!body) return { docs: [], hasMore: false };
  const docs = Array.isArray(body.docs) ? body.docs : [];
  return {
    docs: docs.map(parseOpportunity).filter((d): d is Opportunity => d !== null),
    hasMore: body.hasNextPage === true,
  };
}

export async function fetchCmsOpportunityById(
  id: string,
  options: OpportunityCmsOptions = {},
): Promise<Opportunity | null> {
  const page = await fetchCmsOpportunities({ ids: [id], pageSize: 1 }, options);
  return page.docs[0] ?? null;
}

async function fetchJson(path: string, options: OpportunityCmsOptions): Promise<Record<string, unknown> | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.baseUrl ?? DEFAULT_CMS_BASE_URL).replace(/\/+$/, '');
  try {
    const res = await fetchImpl(`${base}${path}`, {
      headers: { accept: 'application/json' },
      cache: options.cache ?? 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as unknown;
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function parseOpportunity(value: unknown): Opportunity | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const id = typeof v.id === 'number' ? String(v.id) : str(v.id);
  const title = str(v.title);
  const company = str(v.company);
  const applyUrl = str(v.applyUrl);
  const postedAt = str(v.postedAt);
  if (!id || !title || !company || !applyUrl || !postedAt) return null;
  if (!isOneOf(OPPORTUNITY_SOURCES, v.source)) return null;
  const status = v.status === 'published' || v.status === 'expired' || v.status === 'draft' ? v.status : 'draft';
  return {
    id,
    title,
    company,
    location: str(v.location) ?? '',
    remote: isOneOf(REMOTE_TYPES, v.remote) ? v.remote : 'onsite',
    region: isOneOf(JOB_REGIONS, v.region) ? v.region : 'other',
    category: isOneOf(JOB_CATEGORIES, v.category) ? v.category : 'other',
    ...(str(v.employmentType) ? { employmentType: str(v.employmentType) as string } : {}),
    summary: str(v.summary) ?? '',
    descriptionMarkdown: str(v.descriptionMarkdown) ?? '',
    applyUrl,
    source: v.source,
    sourceId: str(v.sourceId) ?? '',
    dedupeKey: str(v.dedupeKey) ?? '',
    fingerprint: str(v.fingerprint) ?? '',
    postedAt,
    status,
    tags: Array.isArray(v.tags)
      ? v.tags.flatMap((t) => {
          const s = typeof t === 'object' && t !== null ? str((t as Record<string, unknown>).value) : str(t);
          return s ? [s] : [];
        })
      : [],
    updatedAt: str(v.updatedAt) ?? postedAt,
  };
}

export function opportunityToListing(o: Opportunity, score: number | null = null): JobListing {
  return {
    id: `collected:${o.id}`,
    kind: 'collected',
    title: o.title,
    company: o.company,
    location: o.location,
    remote: o.remote,
    region: o.region,
    category: o.category,
    source: o.source,
    url: o.applyUrl,
    summary: o.summary,
    postedAt: o.postedAt,
    score,
  };
}
