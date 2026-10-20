import type { JobCategory, JobKind, JobRegion, RemoteType } from '@muicv/shared';

export const KIND_LABEL: Record<JobKind, string> = { collected: '精选采集', community: '社区贡献' };
export const REMOTE_LABEL: Record<RemoteType, string> = { remote: '远程', hybrid: '混合', onsite: '坐班' };
export const REGION_LABEL: Record<JobRegion, string> = {
  global: '全球',
  americas: '美洲',
  europe: '欧洲',
  apac: '亚太',
  other: '其他',
};
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
