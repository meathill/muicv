import { classifyCategory } from './classify.ts';
import { countryInfo, LOCATION_REGIONS, type LocationRegion, regionsOfCountry } from './countries.ts';
import { coveredRegions, type LocationRestrictions, parseLocationRestrictions, WORKPLACES } from './location.ts';
import { buildEmbeddingText, jobFingerprint, jobUrlKey, summarize } from './text.ts';
import {
  isOneOf,
  JOB_CATEGORIES,
  type JobCategory,
  type JobKind,
  type JobListing,
  type JobSearchFilters,
  type Opportunity,
} from './types.ts';
import { type IndexableJob, jobVectorId } from './vector.ts';

/**
 * D1 `jobIndex` 读写（api 与 cron 共用，迁移见 website/migrations/0018_job_index.sql）。
 * 用结构类型描述 D1，避免 shared 依赖 workers-types。
 */

export type SqlStatement = {
  bind(...values: unknown[]): SqlStatement;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
};
export type SqlDatabase = { prepare(sql: string): SqlStatement; batch?(statements: SqlStatement[]): Promise<unknown> };

export type JobIndexRow = {
  id: string;
  kind: JobKind;
  refId: string;
  title: string;
  company: string;
  location: string;
  workplace: LocationRestrictions['workplace'];
  category: JobCategory;
  source: string;
  url: string;
  summary: string;
  body: string;
  allowedCountries: string;
  allowedRegions: string;
  coveredRegions: string;
  isOpenLocation: number;
  utcOffsetMin: number | null;
  utcOffsetMax: number | null;
  officeLocations: string;
  fingerprint: string;
  urlKey: string;
  status: string;
  postedAt: number;
  updatedAt: number;
};

const BODY_MAX = 6000;

function wrapList(values: readonly string[]): string {
  return values.length ? `,${values.join(',')},` : '';
}

function unwrapList(value: string): string[] {
  return value.split(',').filter(Boolean);
}

function baseRow(
  input: LocationRestrictions & {
    kind: JobKind;
    refId: string;
    title: string;
    company: string;
    location: string;
    category: JobCategory;
    source: string;
    url: string;
    body: string;
    status: string;
    postedAt: number;
  },
  now: number,
): JobIndexRow {
  return {
    id: jobVectorId(input.kind, input.refId),
    kind: input.kind,
    refId: input.refId,
    title: input.title,
    company: input.company,
    location: input.location,
    workplace: input.workplace,
    category: input.category,
    source: input.source,
    url: input.url,
    summary: summarize(input.body),
    body: input.body.slice(0, BODY_MAX),
    allowedCountries: wrapList(input.allowedCountries),
    allowedRegions: wrapList(input.allowedRegions),
    coveredRegions: wrapList(coveredRegions(input)),
    isOpenLocation: input.allowedCountries.length === 0 && input.allowedRegions.length === 0 ? 1 : 0,
    utcOffsetMin: input.utcOffsetMin,
    utcOffsetMax: input.utcOffsetMax,
    officeLocations: JSON.stringify(input.officeLocations),
    fingerprint: jobFingerprint(input.company, input.title),
    urlKey: jobUrlKey(input.url),
    status: input.status,
    postedAt: input.postedAt,
    updatedAt: now,
  };
}

export function opportunityToIndexRow(doc: Opportunity, now = Date.now()): JobIndexRow {
  return baseRow(
    {
      ...doc,
      kind: 'collected',
      refId: doc.id,
      url: doc.applyUrl,
      body: doc.descriptionMarkdown,
      postedAt: new Date(doc.postedAt).getTime(),
    },
    now,
  );
}

export type CommunityJdLike = {
  id: string;
  canonicalUrl: string;
  sourceSite: string;
  title: string | null;
  company: string | null;
  location: string | null;
  markdown: string;
  status: string;
  createdAt: number;
};

/** 社区 JD 没有结构化地域字段：按 location + 正文规则解析。 */
export function communityToIndexRow(jd: CommunityJdLike, now = Date.now()): JobIndexRow {
  const title = jd.title ?? '未命名岗位';
  const restrictions = parseLocationRestrictions({
    locations: jd.location ? [jd.location] : [],
    body: jd.markdown,
    title,
  });
  return baseRow(
    {
      ...restrictions,
      kind: 'community',
      refId: jd.id,
      title,
      company: jd.company ?? '未知公司',
      location: jd.location ?? '',
      category: classifyCategory(title),
      source: jd.sourceSite,
      url: jd.canonicalUrl,
      body: jd.markdown,
      status: jd.status,
      postedAt: jd.createdAt,
    },
    now,
  );
}

const COLUMNS: Array<keyof JobIndexRow> = [
  'id',
  'kind',
  'refId',
  'title',
  'company',
  'location',
  'workplace',
  'category',
  'source',
  'url',
  'summary',
  'body',
  'allowedCountries',
  'allowedRegions',
  'coveredRegions',
  'isOpenLocation',
  'utcOffsetMin',
  'utcOffsetMax',
  'officeLocations',
  'fingerprint',
  'urlKey',
  'status',
  'postedAt',
  'updatedAt',
];

/** ON CONFLICT DO UPDATE（而不是 INSERT OR REPLACE），保证 FTS 的 UPDATE 触发器正确同步。 */
const UPSERT_SQL = `INSERT INTO jobIndex (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})
ON CONFLICT(id) DO UPDATE SET ${COLUMNS.filter((c) => c !== 'id')
  .map((c) => `${c} = excluded.${c}`)
  .join(', ')}`;

export async function upsertJobIndexRows(db: SqlDatabase, rows: JobIndexRow[]): Promise<void> {
  if (rows.length === 0) return;
  const statements = rows.map((row) => db.prepare(UPSERT_SQL).bind(...COLUMNS.map((c) => row[c])));
  if (db.batch) await db.batch(statements);
  else for (const s of statements) await s.run();
}

export async function setJobIndexStatus(
  db: SqlDatabase,
  ids: string[],
  status: string,
  now = Date.now(),
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .prepare(`UPDATE jobIndex SET status = ?, updatedAt = ? WHERE id IN (${ids.map(() => '?').join(',')})`)
    .bind(status, now, ...ids)
    .run();
}

export function indexRowToIndexable(row: JobIndexRow): IndexableJob {
  return {
    id: row.id,
    text: buildEmbeddingText({ title: row.title, company: row.company, location: row.location, body: row.body }),
    metadata: {
      kind: row.kind,
      refId: row.refId,
      workplace: row.workplace,
      category: row.category,
      postedAt: row.postedAt,
    },
  };
}

export function rowToListing(row: JobIndexRow, score: number | null = null): JobListing {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    company: row.company,
    location: row.location,
    workplace: isOneOf(WORKPLACES, row.workplace) ? row.workplace : 'onsite',
    allowedCountries: unwrapList(row.allowedCountries),
    allowedRegions: unwrapList(row.allowedRegions).filter((r): r is LocationRegion => isOneOf(LOCATION_REGIONS, r)),
    utcOffsetMin: row.utcOffsetMin,
    utcOffsetMax: row.utcOffsetMax,
    officeLocations: safeJsonArray(row.officeLocations),
    category: isOneOf(JOB_CATEGORIES, row.category) ? row.category : 'other',
    source: row.source,
    url: row.url,
    summary: row.summary,
    postedAt: new Date(row.postedAt).toISOString(),
    score,
  };
}

function safeJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * 结构化硬过滤 → SQL WHERE（关键词、语义两路回源都用它）。表别名固定为 j。
 * - country：未声明限制 / 允许国家含它 / 允许大区含 worldwide 或该国所属大区
 * - utcOffset（或由 country 推出的时区范围）：岗位未声明时区，或区间有交集
 */
export function buildFilterSql(filters: JobSearchFilters): { where: string; params: unknown[] } {
  const clauses = [`j.status = 'published'`];
  const params: unknown[] = [];
  if (filters.kind) {
    clauses.push('j.kind = ?');
    params.push(filters.kind);
  }
  if (filters.workplace) {
    clauses.push('j.workplace = ?');
    params.push(filters.workplace);
  }
  if (filters.category) {
    clauses.push('j.category = ?');
    params.push(filters.category);
  }
  if (filters.region) {
    clauses.push(`(j.coveredRegions LIKE ? OR j.allowedRegions LIKE '%,worldwide,%')`);
    params.push(`%,${filters.region},%`);
  }
  if (filters.country) {
    const code = filters.country.toUpperCase();
    const regionClauses = ['worldwide', ...regionsOfCountry(code)].map(() => 'j.allowedRegions LIKE ?');
    clauses.push(`(j.isOpenLocation = 1 OR j.allowedCountries LIKE ? OR ${regionClauses.join(' OR ')})`);
    params.push(`%,${code},%`, ...['worldwide', ...regionsOfCountry(code)].map((r) => `%,${r},%`));
  }
  const utc = userUtcRange(filters);
  if (utc) {
    clauses.push('(j.utcOffsetMin IS NULL OR (j.utcOffsetMin <= ? AND j.utcOffsetMax >= ?))');
    params.push(utc[1], utc[0]);
  }
  return { where: clauses.join(' AND '), params };
}

export function userUtcRange(filters: JobSearchFilters): [number, number] | null {
  if (typeof filters.utcOffset === 'number') return [filters.utcOffset, filters.utcOffset];
  if (filters.country) return countryInfo(filters.country)?.utc ?? null;
  return null;
}
