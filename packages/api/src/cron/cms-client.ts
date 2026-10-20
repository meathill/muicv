import type { OpportunityInput } from '@muicv/shared';

/**
 * 写 CMS 用 Payload REST + 采集专用账号的 API key（`users API-Key <key>`）。
 * 只用到 3 个操作：取已有键、新建、批量过期。
 */
export type CmsWriter = {
  listExistingKeys(sinceIso: string): Promise<{ dedupeKeys: Set<string>; fingerprints: Set<string> }>;
  create(doc: OpportunityInput): Promise<string>;
  /** 过期 postedAt < cutoff 的已发布岗位；exceptCompanies 不参与（由各自的 maxAgeDays 管） */
  expireBefore(cutoffIso: string, exceptCompanies?: string[]): Promise<string[]>;
  /** 过期某公司在该来源下「已不在岗位板上」或超过 cutoff 的岗位 */
  expireCompany?(source: string, company: string, keepSourceIds: string[], cutoffIso: string): Promise<string[]>;
};

export function createCmsWriter(baseUrl: string, apiKey: string, fetchImpl: typeof fetch = fetch): CmsWriter {
  const base = baseUrl.replace(/\/+$/, '');
  const headers = { 'content-type': 'application/json', authorization: `users API-Key ${apiKey}` };

  async function request(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    const res = await fetchImpl(`${base}/api/opportunities${path}`, { ...init, headers });
    if (!res.ok)
      throw new Error(`CMS ${init.method ?? 'GET'} ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as Record<string, unknown>;
  }

  function docsOf(body: Record<string, unknown>): Array<Record<string, unknown>> {
    return Array.isArray(body.docs) ? (body.docs as Array<Record<string, unknown>>) : [];
  }

  return {
    async listExistingKeys(sinceIso) {
      const params = new URLSearchParams({
        pagination: 'false',
        depth: '0',
        'where[postedAt][greater_than_equal]': sinceIso,
        'select[dedupeKey]': 'true',
        'select[fingerprint]': 'true',
      });
      const docs = docsOf(await request(`?${params.toString()}`));
      return {
        dedupeKeys: new Set(docs.map((d) => String(d.dedupeKey))),
        fingerprints: new Set(docs.map((d) => String(d.fingerprint))),
      };
    },
    async create(doc) {
      const body = await request('', {
        method: 'POST',
        body: JSON.stringify({ ...doc, tags: doc.tags.map((value) => ({ value })) }),
      });
      const created = (body.doc ?? {}) as Record<string, unknown>;
      return String(created.id);
    },
    async expireBefore(cutoffIso, exceptCompanies = []) {
      const params = new URLSearchParams({
        depth: '0',
        'where[status][equals]': 'published',
        'where[postedAt][less_than]': cutoffIso,
      });
      if (exceptCompanies.length) params.set('where[company][not_in]', exceptCompanies.join(','));
      const body = await request(`?${params.toString()}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'expired' }),
      });
      return docsOf(body).map((d) => String(d.id));
    },
    async expireCompany(source, company, keepSourceIds, cutoffIso) {
      const base = {
        depth: '0',
        'where[and][0][status][equals]': 'published',
        'where[and][1][source][equals]': source,
        'where[and][2][company][equals]': company,
      };
      // 已下架（不在本次 feed 里）或超过该公司的 maxAgeDays
      const params = new URLSearchParams({
        ...base,
        'where[and][3][or][0][postedAt][less_than]': cutoffIso,
        ...(keepSourceIds.length ? { 'where[and][3][or][1][sourceId][not_in]': keepSourceIds.join(',') } : {}),
      });
      const body = await request(`?${params.toString()}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'expired' }),
      });
      return docsOf(body).map((d) => String(d.id));
    },
  };
}
