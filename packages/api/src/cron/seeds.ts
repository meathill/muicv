import type { OpportunitySource } from '@muicv/shared';

/**
 * 采集种子：在公开 ATS 上有岗位板的知名科技公司（2026-10-20 逐个验证接口 200）。
 * 改这里即可增删公司，token 即各 ATS 的 board slug。
 */
export type SeedCompany = {
  source: Extract<OpportunitySource, 'greenhouse' | 'lever' | 'ashby'>;
  token: string;
  name: string;
  /**
   * 该公司岗位的最长收录天数（默认走全局 30 天）。设置后不受全局过期影响，
   * 改为「超过 maxAgeDays 或已从岗位板下架」才过期——用于岗位常年挂着、发布时间很老的公司。
   */
  maxAgeDays?: number;
};

export const SEED_COMPANIES: SeedCompany[] = [
  { source: 'greenhouse', token: 'stripe', name: 'Stripe' },
  { source: 'greenhouse', token: 'airbnb', name: 'Airbnb' },
  { source: 'greenhouse', token: 'figma', name: 'Figma' },
  { source: 'greenhouse', token: 'discord', name: 'Discord' },
  { source: 'greenhouse', token: 'dropbox', name: 'Dropbox' },
  { source: 'greenhouse', token: 'cloudflare', name: 'Cloudflare' },
  { source: 'greenhouse', token: 'databricks', name: 'Databricks' },
  { source: 'greenhouse', token: 'gitlab', name: 'GitLab' },
  { source: 'greenhouse', token: 'coinbase', name: 'Coinbase' },
  { source: 'greenhouse', token: 'reddit', name: 'Reddit' },
  { source: 'greenhouse', token: 'datadog', name: 'Datadog' },
  { source: 'greenhouse', token: 'anthropic', name: 'Anthropic' },
  { source: 'greenhouse', token: 'vercel', name: 'Vercel' },
  { source: 'lever', token: 'spotify', name: 'Spotify' },
  { source: 'lever', token: 'palantir', name: 'Palantir' },
  { source: 'ashby', token: 'openai', name: 'OpenAI' },
  { source: 'ashby', token: 'notion', name: 'Notion' },
  { source: 'ashby', token: 'linear', name: 'Linear' },
  { source: 'ashby', token: 'ramp', name: 'Ramp' },
  { source: 'ashby', token: 'posthog', name: 'PostHog' },
];

/** Remotive 只取技术相关分类。 */
export const REMOTIVE_CATEGORIES = ['software-dev', 'devops', 'data', 'design', 'qa', 'product'];

/**
 * 垂直 / 远程岗位板（每天 2 次，见 wrangler triggers）。一项 = 一次子请求（Himalayas 按 pages 计）。
 * 条款与 feed 地址核对记录见 DEV_NOTE「垂直岗位板」。
 */
export type NicheFeed =
  | { source: 'vuejobs' | 'larajobs' | 'remoteok' | 'golangprojects' }
  | { source: 'ats'; seed: SeedCompany }
  | { source: 'weworkremotely'; category: string }
  | { source: 'jobicy'; industry: string }
  | { source: 'himalayas'; pages: number };

export const NICHE_FEEDS: NicheFeed[] = [
  { source: 'vuejobs' },
  { source: 'larajobs' },
  { source: 'weworkremotely', category: 'remote-programming-jobs' },
  { source: 'weworkremotely', category: 'remote-devops-sysadmin-jobs' },
  { source: 'remoteok' },
  { source: 'himalayas', pages: 3 },
  { source: 'jobicy', industry: 'engineering' },
  { source: 'golangprojects' },
  // Supabase（Ashby）：岗位常年挂着（2026-10 实测 52 个，30 天内仅 14 个），低频采集 + 放宽到 365 天，下架即过期
  { source: 'ats', seed: { source: 'ashby', token: 'supabase', name: 'Supabase', maxAgeDays: 365 } },
];

/** 设置了 maxAgeDays 的公司（两个分组都要从全局过期里排除它们） */
export const LONG_LIVED_SEEDS: SeedCompany[] = [
  ...SEED_COMPANIES,
  ...NICHE_FEEDS.flatMap((f) => (f.source === 'ats' ? [f.seed] : [])),
].filter((s) => s.maxAgeDays !== undefined);

/** 子请求计数（预算用） */
export function nicheFeedRequests(feeds: NicheFeed[]): number {
  return feeds.reduce((n, f) => n + (f.source === 'himalayas' ? f.pages : 1), 0);
}
