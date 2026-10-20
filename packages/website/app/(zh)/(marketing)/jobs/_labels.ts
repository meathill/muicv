import type { JobKind, JobRegion, RemoteType } from '@muicv/shared';

export const SITE_LABEL: Record<string, string> = {
  boss: 'Boss直聘',
  zhilian: '智联',
  liepin: '猎聘',
  lagou: '拉勾',
  job51: '前程无忧',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  remotive: 'Remotive',
  generic: '其他',
};

export const KIND_TABS: Array<{ value: JobKind | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'collected', label: '精选采集' },
  { value: 'community', label: '社区贡献' },
];

export const REMOTE_LABEL: Record<RemoteType, string> = { remote: '远程', hybrid: '混合', onsite: '坐班' };

export const REGION_LABEL: Record<JobRegion, string> = {
  global: '全球',
  americas: '美洲',
  europe: '欧洲',
  apac: '亚太',
  other: '其他',
};
