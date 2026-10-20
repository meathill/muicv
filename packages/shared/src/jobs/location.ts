import { findCountries, LOCATION_REGIONS, type LocationRegion, regionsOfCountry } from './countries.ts';

/**
 * 岗位地域限制解析（规则版）：从 ATS location 字段 + JD 正文提取
 * workplace / 允许国家 / 允许大区 / 时区范围 / 办公地点。
 *
 * 口径：
 * - remote 岗：allowedCountries / allowedRegions / utc 表示「候选人必须在这里」；都为空 = 未声明限制（视为不限）
 * - onsite / hybrid 岗：allowedCountries = 办公地点所在国（要去现场）
 */

export const WORKPLACES = ['remote', 'hybrid', 'onsite'] as const;
export type Workplace = (typeof WORKPLACES)[number];

export type LocationRestrictions = {
  workplace: Workplace;
  allowedCountries: string[];
  allowedRegions: LocationRegion[];
  utcOffsetMin: number | null;
  utcOffsetMax: number | null;
  officeLocations: string[];
};

const REGION_RULES: Array<[LocationRegion, RegExp]> = [
  ['worldwide', /\b(worldwide|anywhere|global(ly)?|any location|fully distributed)\b|全球|不限地区/i],
  ['emea', /\bemea\b/i],
  ['apac', /\b(apac|asia[- ]pacific|asia)\b|亚太|亚洲/i],
  ['latam', /\b(latam|latin america|south america)\b|拉美/i],
  ['north-america', /\b(north america|n\. america)\b|北美/i],
  ['americas', /\bamericas\b|美洲/i],
  ['europe', /\b(europe|european union|eu)\b|欧洲/i],
];

export function findRegions(text: string): LocationRegion[] {
  return REGION_RULES.filter(([, re]) => re.test(text)).map(([region]) => region);
}

/** 常见时区缩写 → UTC 偏移（标准时间）。 */
const TZ_ABBR: Record<string, number> = {
  PST: -8,
  PT: -8,
  MST: -7,
  MT: -7,
  CST: -6,
  CT: -6,
  EST: -5,
  ET: -5,
  GMT: 0,
  UTC: 0,
  WET: 0,
  BST: 1,
  CET: 1,
  CEST: 2,
  EET: 2,
  IST: 5.5,
  SGT: 8,
  HKT: 8,
  JST: 9,
  KST: 9,
  AEST: 10,
};

const OFFSET = String.raw`(?:UTC|GMT)\s*([+\-−±]\s*\d{1,2}(?::?(?:30|45))?)`;

function parseOffset(raw: string): number {
  const s = raw.replace(/\s|−/g, (m) => (m === '−' ? '-' : ''));
  const m = /^([+-])(\d{1,2})(?::?(30|45))?$/.exec(s);
  if (!m) return 0;
  const value = Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0);
  return m[1] === '-' ? -value : value;
}

/** 提取时区范围：「UTC-5 to UTC+3」「GMT+1」「within 3 hours of CET」「US time zones」「东八区」。 */
export function findUtcRange(text: string): [number, number] | null {
  const range = new RegExp(`${OFFSET}\\s*(?:to|-|–|~|and|至|到)\\s*${OFFSET}`, 'i').exec(text);
  if (range?.[1] && range[2]) {
    const a = parseOffset(range[1]);
    const b = parseOffset(range[2]);
    return [Math.min(a, b), Math.max(a, b)];
  }
  const within = /(?:within|±|\+\/-)\s*(\d{1,2})\s*hours?\s*(?:of|from)\s*([A-Z]{2,4}|UTC|GMT)/i.exec(text);
  if (within?.[1] && within[2]) {
    const center = TZ_ABBR[within[2].toUpperCase()];
    if (center !== undefined) return [center - Number(within[1]), center + Number(within[1])];
  }
  if (/\b(US|U\.S\.|North American?)\s+time\s*zones?\b/i.test(text)) return [-10, -4];
  if (/\b(European|EU|CET)\s+time\s*zones?\b/i.test(text)) return [0, 3];
  const single = new RegExp(`${OFFSET}`, 'i').exec(text);
  if (single?.[1]) {
    const v = parseOffset(single[1]);
    return [v, v];
  }
  const cn = /东(\d|[一二三四五六七八九十])区/.exec(text);
  if (cn?.[1]) {
    const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    const v = map[cn[1]] ?? Number(cn[1]);
    return [v, v];
  }
  return null;
}

export function detectWorkplace(text: string, hint?: string | boolean): Workplace {
  const h = typeof hint === 'string' ? hint.toLowerCase().replace(/[^a-z]/g, '') : '';
  if (h === 'hybrid') return 'hybrid';
  if (h === 'remote') return 'remote';
  if (h === 'onsite' || h === 'inoffice') return 'onsite';
  if (/\bhybrid\b|混合办公|混合/i.test(text)) return 'hybrid';
  if (hint === true || /\bremote\b|远程|居家|在家办公|wfh/i.test(text)) return 'remote';
  return 'onsite';
}

/** JD 正文里的「必须身在 X」类限制句（只看这些句子，避免把公司介绍里的国家当限制）。 */
const RESTRICTION_SENTENCE =
  /[^.\n。]*\b(must (be|reside|live)|based in|located in|residing in|reside in|eligible to work|work authorization|authorized to work|only (open|available) to|candidates (in|from)|this role is open to|time ?zones?|overlap)\b[^.\n。]*|[^。\n]*(仅限|需(在|位于)|必须(在|位于)|时区)[^。\n]*/gi;

export function restrictionSentences(body: string): string {
  return (body.slice(0, 20000).match(RESTRICTION_SENTENCE) ?? []).join('\n');
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export type LocationInput = {
  /** ATS location 字段（可多条） */
  locations: string[];
  /** ATS 给的 workplace / isRemote 提示 */
  workplaceHint?: string | boolean | undefined;
  /** JD 正文（纯文本） */
  body?: string;
  title?: string;
};

export function parseLocationRestrictions(input: LocationInput): LocationRestrictions {
  const locText = input.locations.filter(Boolean).join(' | ');
  const sentences = input.body ? restrictionSentences(input.body) : '';
  const workplace = detectWorkplace(`${input.title ?? ''} ${locText}`, input.workplaceHint);

  let countries = findCountries(locText);
  let regions = findRegions(locText);
  let utc = findUtcRange(locText);

  // location 字段没写清楚时，退到正文里的限制句
  if (countries.length === 0 && regions.length === 0) {
    countries = findCountries(sentences);
    regions = findRegions(sentences);
  }
  utc ??= findUtcRange(sentences);

  // 写了 worldwide 就不再叠加其它大区（「Worldwide, EMEA preferred」视为全球）
  if (regions.includes('worldwide')) {
    regions = ['worldwide'];
    countries = [];
  }

  const officeLocations =
    workplace === 'remote'
      ? []
      : uniq(
          input.locations
            .flatMap((l) => l.split(/\s*[|;]\s*/))
            .map((l) => l.replace(/\b(hybrid|remote|on-?site|office)\b[\s:-]*/gi, '').trim())
            .filter(Boolean),
        );

  return {
    workplace,
    allowedCountries: uniq(countries),
    allowedRegions: uniq(regions).filter((r): r is LocationRegion =>
      (LOCATION_REGIONS as readonly string[]).includes(r),
    ),
    utcOffsetMin: utc ? utc[0] : null,
    utcOffsetMax: utc ? utc[1] : null,
    officeLocations,
  };
}

/** 该岗位覆盖的大区集合（allowedRegions ∪ 允许国家所属大区），用于按大区筛选。 */
export function coveredRegions(r: Pick<LocationRestrictions, 'allowedCountries' | 'allowedRegions'>): LocationRegion[] {
  return uniq([...r.allowedRegions, ...r.allowedCountries.flatMap(regionsOfCountry)]);
}

/** 内存版资格判断（与 api SQL 条件同口径，用于测试与客户端提示）。 */
export function isEligible(
  job: Pick<LocationRestrictions, 'allowedCountries' | 'allowedRegions' | 'utcOffsetMin' | 'utcOffsetMax'>,
  user: { country?: string; utcRange?: [number, number] },
): boolean {
  if (user.country) {
    const c = user.country.toUpperCase();
    const userRegions = regionsOfCountry(c);
    const open = job.allowedCountries.length === 0 && job.allowedRegions.length === 0;
    const ok =
      open ||
      job.allowedCountries.includes(c) ||
      job.allowedRegions.includes('worldwide') ||
      job.allowedRegions.some((r) => userRegions.includes(r));
    if (!ok) return false;
  }
  if (user.utcRange && job.utcOffsetMin !== null && job.utcOffsetMax !== null) {
    if (job.utcOffsetMin > user.utcRange[1] || job.utcOffsetMax < user.utcRange[0]) return false;
  }
  return true;
}
