/**
 * 岗位地域限制用的国家表（ISO 3166-1 alpha-2）：别名（中英）、所属大区、UTC 偏移范围（小时）。
 * 只收求职场景常见国家；不在表里的国家照样能以 ISO code 传入，只是不参与文本识别。
 */

export const LOCATION_REGIONS = ['worldwide', 'americas', 'north-america', 'latam', 'emea', 'europe', 'apac'] as const;
export type LocationRegion = (typeof LOCATION_REGIONS)[number];

export type CountryInfo = {
  code: string;
  names: string[];
  regions: LocationRegion[];
  utc: [number, number];
};

const NA: LocationRegion[] = ['americas', 'north-america'];
const LA: LocationRegion[] = ['americas', 'latam'];
const EU: LocationRegion[] = ['emea', 'europe'];
const ME: LocationRegion[] = ['emea'];
const AP: LocationRegion[] = ['apac'];

export const COUNTRIES: CountryInfo[] = [
  { code: 'US', names: ['united states', 'usa', 'u.s.', 'us', 'america', '美国'], regions: NA, utc: [-10, -4] },
  { code: 'CA', names: ['canada', '加拿大'], regions: NA, utc: [-8, -3.5] },
  { code: 'MX', names: ['mexico', '墨西哥'], regions: LA, utc: [-8, -5] },
  { code: 'BR', names: ['brazil', 'brasil', '巴西'], regions: LA, utc: [-5, -2] },
  { code: 'AR', names: ['argentina', '阿根廷'], regions: LA, utc: [-3, -3] },
  { code: 'CO', names: ['colombia', '哥伦比亚'], regions: LA, utc: [-5, -5] },
  { code: 'CL', names: ['chile', '智利'], regions: LA, utc: [-4, -3] },
  {
    code: 'GB',
    names: ['united kingdom', 'uk', 'u.k.', 'england', 'scotland', 'britain', 'london', '英国'],
    regions: EU,
    utc: [0, 1],
  },
  { code: 'IE', names: ['ireland', 'dublin', '爱尔兰'], regions: EU, utc: [0, 1] },
  { code: 'DE', names: ['germany', 'deutschland', 'berlin', 'munich', '德国'], regions: EU, utc: [1, 2] },
  { code: 'FR', names: ['france', 'paris', '法国'], regions: EU, utc: [1, 2] },
  { code: 'NL', names: ['netherlands', 'amsterdam', 'holland', '荷兰'], regions: EU, utc: [1, 2] },
  { code: 'ES', names: ['spain', 'madrid', 'barcelona', '西班牙'], regions: EU, utc: [0, 2] },
  { code: 'PT', names: ['portugal', 'lisbon', '葡萄牙'], regions: EU, utc: [0, 1] },
  { code: 'IT', names: ['italy', 'milan', '意大利'], regions: EU, utc: [1, 2] },
  { code: 'PL', names: ['poland', 'warsaw', '波兰'], regions: EU, utc: [1, 2] },
  { code: 'SE', names: ['sweden', 'stockholm', '瑞典'], regions: EU, utc: [1, 2] },
  { code: 'CH', names: ['switzerland', 'zurich', '瑞士'], regions: EU, utc: [1, 2] },
  { code: 'DK', names: ['denmark', 'copenhagen', '丹麦'], regions: EU, utc: [1, 2] },
  { code: 'FI', names: ['finland', 'helsinki', '芬兰'], regions: EU, utc: [2, 3] },
  { code: 'NO', names: ['norway', 'oslo', '挪威'], regions: EU, utc: [1, 2] },
  { code: 'AT', names: ['austria', 'vienna', '奥地利'], regions: EU, utc: [1, 2] },
  { code: 'BE', names: ['belgium', 'brussels', '比利时'], regions: EU, utc: [1, 2] },
  { code: 'CZ', names: ['czech', 'czechia', 'prague', '捷克'], regions: EU, utc: [1, 2] },
  { code: 'RO', names: ['romania', '罗马尼亚'], regions: EU, utc: [2, 3] },
  { code: 'UA', names: ['ukraine', '乌克兰'], regions: EU, utc: [2, 3] },
  { code: 'IL', names: ['israel', 'tel aviv', '以色列'], regions: ME, utc: [2, 3] },
  { code: 'AE', names: ['united arab emirates', 'uae', 'dubai', '阿联酋', '迪拜'], regions: ME, utc: [4, 4] },
  { code: 'ZA', names: ['south africa', '南非'], regions: ME, utc: [2, 2] },
  { code: 'NG', names: ['nigeria', '尼日利亚'], regions: ME, utc: [1, 1] },
  { code: 'EG', names: ['egypt', '埃及'], regions: ME, utc: [2, 3] },
  { code: 'TR', names: ['turkey', 'türkiye', 'istanbul', '土耳其'], regions: ME, utc: [3, 3] },
  {
    code: 'IN',
    names: ['india', 'bangalore', 'bengaluru', 'hyderabad', 'mumbai', 'pune', '印度'],
    regions: AP,
    utc: [5.5, 5.5],
  },
  {
    code: 'CN',
    names: [
      'china',
      'mainland china',
      'prc',
      'beijing',
      'shanghai',
      'shenzhen',
      '中国',
      '大陆',
      '北京',
      '上海',
      '深圳',
      '杭州',
      '广州',
    ],
    regions: AP,
    utc: [8, 8],
  },
  { code: 'HK', names: ['hong kong', '香港'], regions: AP, utc: [8, 8] },
  { code: 'TW', names: ['taiwan', 'taipei', '台湾'], regions: AP, utc: [8, 8] },
  { code: 'JP', names: ['japan', 'tokyo', '日本', '东京'], regions: AP, utc: [9, 9] },
  { code: 'KR', names: ['south korea', 'korea', 'seoul', '韩国'], regions: AP, utc: [9, 9] },
  { code: 'SG', names: ['singapore', '新加坡'], regions: AP, utc: [8, 8] },
  { code: 'MY', names: ['malaysia', 'kuala lumpur', '马来西亚'], regions: AP, utc: [8, 8] },
  { code: 'PH', names: ['philippines', 'manila', '菲律宾'], regions: AP, utc: [8, 8] },
  { code: 'VN', names: ['vietnam', 'viet nam', '越南'], regions: AP, utc: [7, 7] },
  { code: 'TH', names: ['thailand', 'bangkok', '泰国'], regions: AP, utc: [7, 7] },
  { code: 'ID', names: ['indonesia', 'jakarta', '印尼', '印度尼西亚'], regions: AP, utc: [7, 9] },
  { code: 'AU', names: ['australia', 'sydney', 'melbourne', '澳大利亚', '澳洲'], regions: AP, utc: [8, 11] },
  { code: 'NZ', names: ['new zealand', '新西兰'], regions: AP, utc: [12, 13] },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** 美国常见州 / 城市：「Remote - San Francisco, CA」这种也要识别为 US。 */
const US_HINTS =
  /\b(san francisco|new york|nyc|seattle|austin|boston|chicago|los angeles|denver|atlanta|miami|washington,? dc|bay area|silicon valley|[A-Z][a-z]+,\s?(CA|NY|WA|TX|MA|IL|CO|GA|FL|OR|NC|VA|PA|NJ|UT|AZ))\b/;

export function countryInfo(code: string): CountryInfo | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{2}$/.test(value);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 2-3 字母缩写（US / UK / UAE）区分大小写只认大写，避免把普通单词 "us" 当成美国；中文子串匹配。 */
const COUNTRY_MATCHERS: Array<{ code: string; re: RegExp }> = COUNTRIES.flatMap((c) =>
  c.names.map((name) => {
    if (/[\u4e00-\u9fff]/.test(name)) return { code: c.code, re: new RegExp(escapeRe(name)) };
    if (name.replace(/\./g, '').length <= 3) {
      return { code: c.code, re: new RegExp(`(^|[^A-Za-z])${escapeRe(name.toUpperCase())}($|[^A-Za-z])`) };
    }
    return { code: c.code, re: new RegExp(`(^|[^a-z])${escapeRe(name)}($|[^a-z])`, 'i') };
  }),
);

/** 文本里出现的所有国家（ISO code，去重）。 */
export function findCountries(text: string): string[] {
  const found = new Set<string>();
  for (const { code, re } of COUNTRY_MATCHERS) {
    if (re.test(text)) found.add(code);
  }
  if (US_HINTS.test(text)) found.add('US');
  return [...found];
}

/** 国家所属大区（含 worldwide 之外的上级区）。 */
export function regionsOfCountry(code: string): LocationRegion[] {
  return countryInfo(code)?.regions ?? [];
}
