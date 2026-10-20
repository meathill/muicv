import {
  classifyCategory,
  htmlToText,
  jobFingerprint,
  type OpportunityInput,
  type OpportunitySource,
  parseLocationRestrictions,
  summarize,
} from '@muicv/shared';

export type RawJob = {
  source: OpportunitySource;
  sourceId: string;
  title: string;
  company: string;
  /** 主 location 字段 */
  location: string;
  /** 其它办公地 / 次要地点（Ashby secondaryLocations、Lever allLocations） */
  extraLocations?: string[];
  isRemote?: boolean;
  workplace?: string;
  employmentType?: string | undefined;
  html?: string;
  plain?: string;
  applyUrl: string;
  postedAt: string | number;
  tags?: string[];
};

/** 原始岗位 → CMS 文档。非技术岗返回 null（频道只做技术岗）。 */
export function normalizeJob(raw: RawJob): OpportunityInput | null {
  const title = raw.title.trim();
  const company = raw.company.trim();
  if (!title || !company || !raw.applyUrl) return null;
  const category = classifyCategory(title);
  if (category === 'other') return null;
  const posted = new Date(raw.postedAt);
  if (Number.isNaN(posted.getTime())) return null;

  const location = raw.location.trim();
  const description = raw.plain?.trim() || (raw.html ? htmlToText(raw.html) : '');
  const restrictions = parseLocationRestrictions({
    locations: [location, ...(raw.extraLocations ?? [])],
    workplaceHint: raw.workplace || raw.isRemote,
    body: description,
    title,
  });

  return {
    title,
    company,
    location,
    ...restrictions,
    category,
    ...(raw.employmentType ? { employmentType: raw.employmentType } : {}),
    summary: summarize(description),
    descriptionMarkdown: description.slice(0, 20000),
    applyUrl: raw.applyUrl,
    source: raw.source,
    sourceId: raw.sourceId,
    dedupeKey: `${raw.source}:${raw.sourceId}`,
    fingerprint: jobFingerprint(company, title),
    postedAt: posted.toISOString(),
    status: 'published',
    tags: (raw.tags ?? []).slice(0, 10),
  };
}
