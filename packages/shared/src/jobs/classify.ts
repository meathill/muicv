import type { JobCategory, JobRegion, JobSearchFilters, RemoteType } from './types.ts';

/** 采集与查询解析共用的规则分类。规则偏保守：拿不准就 other / null。 */

const CATEGORY_RULES: Array<[JobCategory, RegExp]> = [
  ['security', /\b(security|secops|appsec|infosec)\b|安全/i],
  ['devops', /\b(devops|sre|site reliability|infrastructure|platform engineer|cloud engineer)\b|运维|基础设施/i],
  ['data', /\b(data|machine learning|ml|ai engineer|analytics|scientist|research engineer)\b|数据|算法|机器学习/i],
  ['qa', /\b(qa|quality assurance|test engineer|sdet)\b|测试/i],
  ['design', /\b(designer|design|ux|ui)\b|设计/i],
  ['product', /\b(product manager|product owner|pm)\b|产品经理/i],
  [
    'engineering',
    /\b(engineer|developer|programmer|frontend|front-end|backend|back-end|full[- ]?stack|ios|android|software)\b|工程师|开发|前端|后端|全栈/i,
  ],
];

export function classifyCategory(title: string): JobCategory {
  for (const [category, re] of CATEGORY_RULES) {
    if (re.test(title)) return category;
  }
  return 'other';
}

export function isTechCategory(category: JobCategory): boolean {
  return category !== 'other';
}

const REGION_RULES: Array<[JobRegion, RegExp]> = [
  ['global', /\b(worldwide|anywhere|global)\b|全球|不限/i],
  [
    'americas',
    /\b(usa?|united states|canada|mexico|brazil|latam|americas|north america|new york|san francisco|seattle|austin|toronto|chicago|los angeles|boston|denver)\b|美国|加拿大|美洲/i,
  ],
  [
    'europe',
    /\b(uk|united kingdom|london|europe|emea|germany|berlin|france|paris|netherlands|amsterdam|ireland|dublin|spain|poland|portugal|sweden|switzerland)\b|欧洲|英国|德国/i,
  ],
  [
    'apac',
    /\b(apac|asia|singapore|japan|tokyo|india|bangalore|australia|sydney|korea|seoul|china|hong kong|taiwan)\b|亚太|亚洲|新加坡|日本|中国|香港|台湾/i,
  ],
];

export function classifyRegion(location: string): JobRegion {
  for (const [region, re] of REGION_RULES) {
    if (re.test(location)) return region;
  }
  return 'other';
}

export function classifyRemote(location: string, isRemoteHint?: boolean): RemoteType {
  if (/\bhybrid\b|混合/i.test(location)) return 'hybrid';
  if (isRemoteHint || /\bremote\b|远程|居家/i.test(location)) return 'remote';
  return 'onsite';
}

/**
 * 从自然语言 query 中规则抽取结构化过滤条件（零成本、确定性）。
 * 只抽有把握的：remote、region、category。剩下的语义交给向量检索。
 */
export function extractFiltersFromQuery(q: string): JobSearchFilters {
  const filters: JobSearchFilters = {};
  if (/\bhybrid\b|混合办公/i.test(q)) filters.remote = 'hybrid';
  else if (/\bremote\b|远程|居家/i.test(q)) filters.remote = 'remote';
  const region = classifyRegion(q);
  if (region !== 'other' && region !== 'global') filters.region = region;
  const category = classifyCategory(q);
  if (category !== 'other') filters.category = category;
  return filters;
}
