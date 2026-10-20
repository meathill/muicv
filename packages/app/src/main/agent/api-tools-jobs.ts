import {
  describeRestrictions,
  filterTagLabel,
  JOB_CATEGORIES,
  JOB_KINDS,
  JobSearchError,
  type JobSearchResponse,
  LOCATION_REGIONS,
  searchJobs,
  WORKPLACE_LABEL,
  WORKPLACES,
} from '@muicv/shared';
import { tool } from '@openai/agents';
import { z } from 'zod';

import type { AppConfig } from '../../shared/types.ts';

/**
 * search_jobs：桌面端 agent 直接搜 muicv 统一岗位库（采集的国际 / 远程技术岗 + 社区贡献 JD），
 * 走公开 API `GET /jobs/search`（自然语言 + 结构化过滤）。带 muicv API key 时配额更高。
 * 搜到合适的岗位后，agent 可再用 fetch_jd 把原帖落盘到 targets/ 做匹配 / 定制简历。
 */

const MODE_LABEL: Record<JobSearchResponse['mode'], string> = {
  hybrid: '关键词 + 语义混合检索',
  keyword: '关键词检索（语义检索暂不可用）',
  latest: '最新岗位',
};

export function formatJobResults(res: JobSearchResponse): string {
  if (res.items.length === 0) {
    return `没有找到匹配的岗位（${MODE_LABEL[res.mode]}）。可以放宽条件或换个说法再试。`;
  }
  const filters = Object.entries(res.filters)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => {
      const label = filterTagLabel(k as keyof typeof res.filters, v as never);
      return (res.detected ?? []).includes(k as keyof typeof res.filters) ? `${label}（自动识别）` : label;
    })
    .join('，');
  const lines = res.items.map((item, i) => {
    const n = (res.page - 1) * res.pageSize + i + 1;
    const meta = [
      item.location,
      WORKPLACE_LABEL[item.workplace],
      describeRestrictions(item),
      item.kind === 'community' ? '社区贡献' : `via ${item.source}`,
    ]
      .filter(Boolean)
      .join(' · ');
    return `${n}. **${item.title}** — ${item.company}（${meta}，${item.postedAt.slice(0, 10)}）\n   ${item.url}\n   ${item.summary}`;
  });
  return [
    `${MODE_LABEL[res.mode]}${filters ? `，过滤：${filters}` : ''}，第 ${res.page} 页：`,
    ...lines,
    res.hasMore ? `（还有更多，可用 page=${res.page + 1} 翻页）` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildJobSearchTools(config: AppConfig, fetchImpl: typeof fetch = fetch) {
  const searchJobsTool = tool({
    name: 'search_jobs',
    description:
      '在 Mui简历岗位库中搜索招聘岗位（国际 / 远程技术岗 + 用户社区贡献的 JD）。' +
      '用户想「找工作 / 看看有什么机会 / 搜某类岗位」时调用。query 直接用用户的自然语言（中英文皆可），' +
      '系统会自动理解远程、地区、职能、「我在中国 / UTC+8」等；也可以显式传过滤条件。' +
      '如果知道用户所在国家或时区（档案、对话里提过），务必传 country / utcOffset，' +
      '服务端会排除用户无法应聘的岗位（如仅限美国的远程岗）。结果里的 url 可交给 fetch_jd 落盘。',
    parameters: z.object({
      query: z.string().describe('自然语言描述，如「欧洲远程的资深后端，Go 优先」'),
      kind: z.enum(JOB_KINDS).nullable().describe('collected=采集岗位，community=社区贡献；不限传 null'),
      workplace: z.enum(WORKPLACES).nullable().describe('remote/hybrid/onsite；不限传 null'),
      region: z.enum(LOCATION_REGIONS).nullable().describe('岗位覆盖的大区；不限传 null'),
      category: z.enum(JOB_CATEGORIES).nullable().describe('不限传 null'),
      country: z
        .string()
        .regex(/^[A-Za-z]{2}$/)
        .nullable()
        .describe('求职者所在国 ISO 3166-1 alpha-2，如 CN；排除不接受该国候选人的岗位。未知传 null'),
      utcOffset: z.number().min(-12).max(14).nullable().describe('求职者所在时区 UTC 偏移小时，如 8；未知传 null'),
      page: z.number().int().min(1).nullable().describe('页码，默认 1'),
    }),
    execute: async ({ query, kind, workplace, region, category, country, utcOffset, page }) => {
      try {
        const res = await searchJobs(
          {
            q: query,
            ...(kind ? { kind } : {}),
            ...(workplace ? { workplace } : {}),
            ...(region ? { region } : {}),
            ...(category ? { category } : {}),
            ...(country ? { country: country.toUpperCase() } : {}),
            ...(utcOffset !== null ? { utcOffset } : {}),
            page: page ?? 1,
            pageSize: 10,
          },
          {
            baseUrl: config.muicvApiBase,
            ...(config.muicvApiKey ? { apiKey: config.muicvApiKey } : {}),
            fetchImpl,
          },
        );
        return formatJobResults(res);
      } catch (error) {
        if (error instanceof JobSearchError && error.status === 429) {
          return '岗位搜索太频繁被限流了，请稍后再试；登录 muicv 并配置 API key 可获得更高额度。';
        }
        return `岗位搜索失败：${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
  return [searchJobsTool];
}
