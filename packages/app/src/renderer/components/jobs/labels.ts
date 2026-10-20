import type { JobCategory, JobKind } from '@muicv/shared';

export { COUNTRY_OPTIONS, LOCATION_REGION_LABEL, WORKPLACE_LABEL } from '@muicv/shared';

export const KIND_LABEL: Record<JobKind, string> = { collected: '精选采集', community: '社区贡献' };
export const CATEGORY_LABEL: Record<JobCategory, string> = {
  engineering: '研发',
  data: '数据 / AI',
  design: '设计',
  product: '产品',
  devops: '运维 / SRE',
  security: '安全',
  qa: '测试',
  other: '其他',
};
export const SOURCE_LABEL: Record<string, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  remotive: 'Remotive',
  boss: 'Boss直聘',
  zhilian: '智联',
  liepin: '猎聘',
  lagou: '拉勾',
  job51: '前程无忧',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  generic: '其他',
};
