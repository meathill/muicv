import { LOCATION_REGIONS, type LocationRegion } from './countries.ts';
import { WORKPLACES } from './location.ts';
import { isOneOf, JOB_CATEGORIES, OPPORTUNITY_SOURCES, type Opportunity } from './types.ts';

/** 读 CMS `opportunities`（公开 REST，匿名只能读 published）。搜索不走这里，走 D1 jobIndex。 */

const DEFAULT_CMS_BASE_URL = 'https://cms.muicv.com';

export type OpportunityCmsOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  cache?: 'default' | 'force-cache' | 'no-store';
};

export type OpportunityListQuery = {
  ids?: string[];
  page?: number;
  pageSize?: number;
  excludeSource?: string;
  /** 只取这些来源（如 sitemap 只要可收录来源） */
  onlySources?: readonly string[];
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
  if (query.ids) params.set('where[id][in]', query.ids.join(','));
  if (query.excludeSource) params.set('where[source][not_equals]', query.excludeSource);
  if (query.onlySources?.length) params.set('where[source][in]', query.onlySources.join(','));
  return params;
}

export async function fetchCmsOpportunities(
  query: OpportunityListQuery,
  options: OpportunityCmsOptions = {},
): Promise<OpportunityPage> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = (options.baseUrl ?? DEFAULT_CMS_BASE_URL).replace(/\/+$/, '');
  try {
    const res = await fetchImpl(`${base}/api/opportunities?${buildOpportunityParams(query).toString()}`, {
      headers: { accept: 'application/json' },
      // Workers 的 RequestInit.cache 只认 no-store / no-cache，Next.js 侧才会传 force-cache 等
      cache: options.cache ?? 'no-store',
    } as unknown as RequestInit);
    if (!res.ok) return { docs: [], hasMore: false };
    const body = (await res.json()) as { docs?: unknown[]; hasNextPage?: boolean };
    const docs = Array.isArray(body.docs) ? body.docs : [];
    return {
      docs: docs.map(parseOpportunity).filter((d): d is Opportunity => d !== null),
      hasMore: body.hasNextPage === true,
    };
  } catch {
    return { docs: [], hasMore: false };
  }
}

export async function fetchCmsOpportunityById(
  id: string,
  options: OpportunityCmsOptions = {},
): Promise<Opportunity | null> {
  const page = await fetchCmsOpportunities({ ids: [id], pageSize: 1 }, options);
  return page.docs[0] ?? null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((t) => {
    const s = typeof t === 'object' && t !== null ? str((t as Record<string, unknown>).value) : str(t);
    return s ? [s] : [];
  });
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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
    workplace: isOneOf(WORKPLACES, v.workplace) ? v.workplace : 'onsite',
    allowedCountries: strArray(v.allowedCountries).map((c) => c.toUpperCase()),
    allowedRegions: strArray(v.allowedRegions).filter((r): r is LocationRegion => isOneOf(LOCATION_REGIONS, r)),
    utcOffsetMin: num(v.utcOffsetMin),
    utcOffsetMax: num(v.utcOffsetMax),
    officeLocations: strArray(v.officeLocations),
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
    tags: strArray(v.tags),
    updatedAt: str(v.updatedAt) ?? postedAt,
  };
}
