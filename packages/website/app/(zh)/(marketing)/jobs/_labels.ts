import { type JobKind, SOURCE_POLICY } from '@muicv/shared';

export const SITE_LABEL: Record<string, string> = {
  ...Object.fromEntries(Object.entries(SOURCE_POLICY).map(([k, v]) => [k, v.label])),
  boss: 'Boss直聘',
  zhilian: '智联',
  liepin: '猎聘',
  lagou: '拉勾',
  job51: '前程无忧',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  generic: '其他',
};

export const KIND_TABS: Array<{ value: JobKind | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'collected', label: '精选采集' },
  { value: 'community', label: '社区贡献' },
];

export { COUNTRY_OPTIONS, describeRestrictions, LOCATION_REGION_LABEL, WORKPLACE_LABEL } from '@muicv/shared';
