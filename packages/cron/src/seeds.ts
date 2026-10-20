import type { OpportunitySource } from '@muicv/shared';

/**
 * 采集种子：在公开 ATS 上有岗位板的知名科技公司（2026-10-20 逐个验证接口 200）。
 * 改这里即可增删公司，token 即各 ATS 的 board slug。
 */
export type SeedCompany = { source: Exclude<OpportunitySource, 'remotive'>; token: string; name: string };

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
  { source: 'ashby', token: 'supabase', name: 'Supabase' },
  { source: 'ashby', token: 'posthog', name: 'PostHog' },
];

/** Remotive 只取技术相关分类。 */
export const REMOTIVE_CATEGORIES = ['software-dev', 'devops', 'data', 'design', 'qa', 'product'];
