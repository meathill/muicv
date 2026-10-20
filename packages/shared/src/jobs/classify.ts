import { COUNTRIES, type LocationRegion } from './countries.ts';
import { findRegions, findUtcRange } from './location.ts';
import type { JobCategory, JobSearchFilters } from './types.ts';

/** 职能分类与自然语言 query 过滤识别。规则偏保守：拿不准就不识别。 */

const CATEGORY_RULES: Array<[JobCategory, RegExp]> = [
  ['security', /\b(security|secops|appsec|infosec)\b|安全/i],
  ['devops', /\b(devops|sre|site reliability|infrastructure|platform engineer|cloud engineer)\b|运维|基础设施/i],
  ['data', /\b(data|machine learning|ml|ai engineer|analytics|scientist|research engineer)\b|数据|算法|机器学习/i],
  ['qa', /\b(qa|quality assurance|test engineer|sdet)\b|测试/i],
  ['design', /\b(designer|design|ux|ui)\b|设计/i],
  ['product', /\b(product manager|product owner|pm)\b|产品经理/i],
  [
    'engineering',
    /\b(engineer|developer|programmer|frontend|front-end|backend|back-end|full[- ]?stack|ios|android|software)\b|工程师|开发|前端|后端|全栈|程序员/i,
  ],
];

export function classifyCategory(title: string): JobCategory {
  for (const [category, re] of CATEGORY_RULES) {
    if (re.test(title)) return category;
  }
  return 'other';
}

/** 「我在中国 / I'm in Germany / based in India」→ 求职者所在国。 */
const SELF_LOCATION =
  /(?:我在|我人在|我住在|我位于|人在|身在|坐标|based in|i'?m in|i am in|living in|located in|from)\s*([A-Za-z .\u4e00-\u9fff]{2,24})/i;

function findSelfCountry(q: string): { code: string; phrase: string } | null {
  const m = SELF_LOCATION.exec(q);
  if (!m?.[1]) return null;
  const tail = m[1].toLowerCase();
  for (const c of COUNTRIES) {
    const name = c.names.find((n) => tail.startsWith(n) || (/[\u4e00-\u9fff]/.test(n) && tail.includes(n)));
    if (name) {
      // 只删「我在 + 国家名」本身，后面的「远程」等仍要参与识别
      const prefixLen = m[0].length - m[1].length;
      return { code: c.code, phrase: m[0].slice(0, prefixLen + tail.indexOf(name) + name.length) };
    }
  }
  return null;
}

const WORKPLACE_PHRASES: Array<[NonNullable<JobSearchFilters['workplace']>, RegExp]> = [
  ['hybrid', /\bhybrid\b|混合办公/i],
  ['remote', /\bremote\b|远程|居家办公|在家办公/i],
  ['onsite', /\bon-?site\b|坐班|驻场/i],
];

export type DetectedQuery = { filters: JobSearchFilters; residual: string };

/**
 * 从 q 中规则抽取结构化过滤，并返回去掉这些短语后的残余文本（供关键词检索，减少噪音）。
 * region 只在没识别出求职者国家时才识别（「我在中国」不是「要亚太岗位」）。
 */
export function detectQueryFilters(q: string): DetectedQuery {
  const filters: JobSearchFilters = {};
  let residual = q;

  const self = findSelfCountry(q);
  if (self) {
    filters.country = self.code;
    residual = residual.replace(self.phrase, ' ');
  }

  const utc = findUtcRange(q);
  if (utc && utc[0] === utc[1]) {
    filters.utcOffset = utc[0];
    residual = residual.replace(/(?:UTC|GMT)\s*[+\-−]\s*\d{1,2}(?::?(?:30|45))?|东.区/gi, ' ');
  }

  for (const [workplace, re] of WORKPLACE_PHRASES) {
    if (re.test(residual)) {
      filters.workplace = workplace;
      residual = residual.replace(new RegExp(re.source, 'gi'), ' ');
      break;
    }
  }

  if (!self) {
    const region = findRegions(residual).find((r): r is LocationRegion => r !== 'worldwide');
    if (region) filters.region = region;
  }

  const category = classifyCategory(residual);
  if (category !== 'other') filters.category = category;

  residual = residual
    .replace(/[，,。.!！?？]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { filters, residual };
}
