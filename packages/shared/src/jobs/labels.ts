import { COUNTRIES, countryInfo, type LocationRegion } from './countries.ts';
import type { LocationRestrictions, Workplace } from './location.ts';
import type { JobFilterKey, JobSearchFilters } from './types.ts';

/** 岗位地域相关的中文展示文案（桌面端 / 网站 / agent 工具共用）。 */

export const WORKPLACE_LABEL: Record<Workplace, string> = { remote: '远程', hybrid: '混合', onsite: '坐班' };

export const LOCATION_REGION_LABEL: Record<LocationRegion, string> = {
  worldwide: '全球',
  americas: '美洲',
  'north-america': '北美',
  latam: '拉美',
  emea: 'EMEA',
  europe: '欧洲',
  apac: '亚太',
};

const CJK = /[\u4e00-\u9fff]/;

export function countryLabel(code: string): string {
  return countryInfo(code)?.names.find((n) => CJK.test(n)) ?? code.toUpperCase();
}

/** 供下拉框使用：[{ code, label }]，按中文名排序 */
export const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = COUNTRIES.map((c) => ({
  code: c.code,
  label: countryLabel(c.code),
})).sort((a, b) => a.label.localeCompare(b.label, 'zh'));

export function formatUtc(offset: number): string {
  if (offset === 0) return 'UTC';
  const abs = Math.abs(offset);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `UTC${offset > 0 ? '+' : '-'}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** 「仅限 美国 / 加拿大 · UTC-8 ~ UTC-5」；无限制返回「不限地区」 */
export function describeRestrictions(
  r: Pick<LocationRestrictions, 'workplace' | 'allowedCountries' | 'allowedRegions' | 'utcOffsetMin' | 'utcOffsetMax'>,
): string {
  const parts: string[] = [];
  const places = [...r.allowedCountries.map(countryLabel), ...r.allowedRegions.map((x) => LOCATION_REGION_LABEL[x])];
  if (places.length) parts.push(`${r.workplace === 'remote' ? '仅限' : '办公地'} ${places.join(' / ')}`);
  if (r.utcOffsetMin !== null && r.utcOffsetMax !== null) {
    parts.push(
      r.utcOffsetMin === r.utcOffsetMax
        ? formatUtc(r.utcOffsetMin)
        : `${formatUtc(r.utcOffsetMin)} ~ ${formatUtc(r.utcOffsetMax)}`,
    );
  }
  return parts.length ? parts.join(' · ') : r.workplace === 'remote' ? '不限地区' : '';
}

const FILTER_NAME: Record<JobFilterKey, string> = {
  kind: '来源',
  workplace: '办公',
  region: '地区',
  category: '职能',
  country: '我在',
  utcOffset: '时区',
};

const KIND_LABEL = { collected: '精选采集', community: '社区贡献' } as const;
const CATEGORY_LABEL = {
  engineering: '研发',
  data: '数据 / AI',
  design: '设计',
  product: '产品',
  devops: '运维 / SRE',
  security: '安全',
  qa: '测试',
  other: '其他',
} as const;

/** 过滤条件 → 标签文案，如「我在：中国」「时区：UTC+8」 */
export function filterTagLabel<K extends JobFilterKey>(key: K, value: NonNullable<JobSearchFilters[K]>): string {
  const v = value as string | number;
  let text: string;
  if (key === 'workplace') text = WORKPLACE_LABEL[v as Workplace];
  else if (key === 'region') text = LOCATION_REGION_LABEL[v as LocationRegion];
  else if (key === 'country') text = countryLabel(String(v));
  else if (key === 'utcOffset') text = formatUtc(Number(v));
  else if (key === 'kind') text = KIND_LABEL[v as keyof typeof KIND_LABEL];
  else text = CATEGORY_LABEL[v as keyof typeof CATEGORY_LABEL];
  return `${FILTER_NAME[key]}：${text ?? String(v)}`;
}
