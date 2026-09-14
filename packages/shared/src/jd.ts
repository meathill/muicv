/**
 * 浏览器扩展 / 桌面端 / API 共用的 JD 契约。
 * 抽取实现留在扩展（依赖 document）；这里只放类型、站点登记、URL 规范化和落盘格式。
 */

export const JOB_SITE_IDS = [
  'boss',
  'zhilian',
  'liepin',
  'lagou',
  'job51',
  'linkedin',
  'indeed',
  'greenhouse',
  'lever',
  'ashby',
  'generic',
] as const;

export type JobSiteId = (typeof JOB_SITE_IDS)[number];

export type JobSiteDef = {
  id: Exclude<JobSiteId, 'generic'>;
  label: string;
  hosts: readonly string[];
  /** 路径命中才当岗位页（host 命中但路径不对 → 不弹提示条）。 */
  pathIncludes: readonly string[];
};

export const JOB_SITES: readonly JobSiteDef[] = [
  { id: 'boss', label: 'Boss直聘', hosts: ['zhipin.com'], pathIncludes: ['/job_detail/', '/job/'] },
  { id: 'zhilian', label: '智联招聘', hosts: ['zhaopin.com'], pathIncludes: ['/job/', '/jobs/'] },
  { id: 'liepin', label: '猎聘', hosts: ['liepin.com'], pathIncludes: ['/job/', '/a/'] },
  { id: 'lagou', label: '拉勾', hosts: ['lagou.com'], pathIncludes: ['/jobs/', '/wn/jobs/'] },
  { id: 'job51', label: '前程无忧', hosts: ['51job.com'], pathIncludes: ['/job/', '/jobs/'] },
  { id: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'], pathIncludes: ['/jobs/view/', '/jobs/collections/'] },
  { id: 'indeed', label: 'Indeed', hosts: ['indeed.com'], pathIncludes: ['/viewjob', '/job/', '/rc/clk'] },
  {
    id: 'greenhouse',
    label: 'Greenhouse',
    hosts: ['greenhouse.io', 'job-boards.greenhouse.io'],
    pathIncludes: ['/jobs/', '/job/'],
  },
  { id: 'lever', label: 'Lever', hosts: ['lever.co'], pathIncludes: ['/'] },
  { id: 'ashby', label: 'Ashby', hosts: ['ashbyhq.com', 'jobs.ashbyhq.com'], pathIncludes: ['/'] },
];

export type CapturedJd = {
  url: string;
  canonicalUrl: string;
  sourceSite: JobSiteId;
  title: string | null;
  company: string | null;
  location: string | null;
  employmentType: string | null;
  markdown: string;
  extractedAt: string;
};

export const EXTENSION_BRIDGE_PORTS = [29876, 29877, 29878, 29879, 29880] as const;
export const EXTENSION_BRIDGE_MAGIC = 'muicv-extension-bridge';

export const JD_STATUSES = ['queued', 'matching', 'suitable', 'weak', 'generating', 'ready', 'error'] as const;
export type JdJobStatus = (typeof JD_STATUSES)[number];

export type MatchVerdict = 'suitable' | 'weak' | 'poor';

export type JdMatchResult = {
  verdict: MatchVerdict;
  score: number;
  covered: string[];
  gaps: string[];
  reason: string;
};

export type ExtensionJobState = {
  jobId: string;
  status: JdJobStatus;
  targetPath?: string;
  match?: JdMatchResult;
  versionPath?: string;
  conversationId?: string;
  error?: string;
};

/** 扩展 → app 的本机协议路径。 */
export const EXTENSION_ROUTES = {
  health: '/health',
  pairBegin: '/pair/begin',
  pairStatus: '/pair/status',
  jd: '/jd',
  generate: '/generate',
  contribute: '/contribute',
} as const;

const TRACKING_PARAM =
  /^(utm_|utm$|fbclid|gclid|gclsrc|dclid|msclkid|twclid|li_fat_id|mc_|pk_|_from|from|scene|sid|sessionid|ka|ref|referer|referrer|source|spm|clickid|traceid)/i;

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function siteIdForHost(hostname: string): JobSiteId {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const site of JOB_SITES) {
    if (site.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return site.id;
  }
  return 'generic';
}

export function findJobSite(url: string): JobSiteDef | null {
  const host = hostnameOf(url);
  if (!host) return null;
  return JOB_SITES.find((site) => site.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/** 已知站点：host + 路径像岗位页。通用站点不在这里判，由 JSON-LD 决定。 */
export function isLikelyJobUrl(url: string): boolean {
  const site = findJobSite(url);
  if (!site) return false;
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return false;
  }
  if (site.id === 'lever' || site.id === 'ashby') {
    return path.split('/').filter(Boolean).length >= 1 && !path.includes('/location') && path !== '/';
  }
  return site.pathIncludes.some((p) => path.includes(p));
}

export function canonicalizeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }
  u.hash = '';
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  const keep = new URLSearchParams();
  for (const [k, v] of u.searchParams) {
    if (TRACKING_PARAM.test(k)) continue;
    keep.append(k, v);
  }
  const site = siteIdForHost(u.hostname);
  if (site === 'linkedin') {
    const m = u.pathname.match(/\/jobs\/view\/(\d+)/);
    if (m) {
      u.pathname = `/jobs/view/${m[1]}`;
      u.search = '';
      return u.toString();
    }
  }
  if (site === 'boss') {
    const m = u.pathname.match(/\/job_detail\/([A-Za-z0-9]+)/);
    if (m) {
      u.pathname = `/job_detail/${m[1]}.html`;
      u.search = '';
      return u.toString();
    }
  }
  if (site === 'indeed') {
    const jk = keep.get('jk');
    if (jk) {
      u.pathname = '/viewjob';
      u.search = `jk=${jk}`;
      return u.toString();
    }
  }
  const qs = keep.toString();
  u.search = qs ? `?${qs}` : '';
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.toString();
}

export function slugifyJd(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9一-龥-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'target'
  );
}

function escapeYaml(s: string): string {
  if (/[:#[\]{}|>*!&%@`,]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

export function targetSlugFor(jd: Pick<CapturedJd, 'company' | 'title'>): string {
  return slugifyJd(`${jd.company ?? 'company'}-${jd.title ?? 'role'}`);
}

export function buildTargetMarkdown(jd: CapturedJd): { relPath: string; content: string } {
  const slug = targetSlugFor(jd);
  const frontmatter = [
    '---',
    'type: target',
    jd.company ? `company: ${escapeYaml(jd.company)}` : null,
    jd.title ? `title: ${escapeYaml(jd.title)}` : null,
    `source_url: ${escapeYaml(jd.canonicalUrl || jd.url)}`,
    `source_site: ${jd.sourceSite}`,
    `fetched_at: ${jd.extractedAt}`,
    jd.location ? `location: ${escapeYaml(jd.location)}` : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    relPath: `targets/${slug}.md`,
    content: `${frontmatter}\n\n## JD 正文\n\n${jd.markdown.trim()}\n`,
  };
}

export function parseMatchVerdict(raw: unknown): JdMatchResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const verdict = o.verdict;
  if (verdict !== 'suitable' && verdict !== 'weak' && verdict !== 'poor') return null;
  const score = typeof o.score === 'number' && Number.isFinite(o.score) ? Math.max(0, Math.min(100, o.score)) : 0;
  const covered = Array.isArray(o.covered) ? o.covered.filter((x) => typeof x === 'string') : [];
  const gaps = Array.isArray(o.gaps) ? o.gaps.filter((x) => typeof x === 'string') : [];
  const reason = typeof o.reason === 'string' && o.reason.trim() ? o.reason.trim() : '未给出理由';
  return { verdict, score, covered, gaps, reason };
}

export function parseMatchJson(text: string): JdMatchResult | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const payload = fenced?.[1]?.trim() ?? trimmed;
  try {
    return parseMatchVerdict(JSON.parse(payload));
  } catch {
    const start = payload.indexOf('{');
    const end = payload.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return parseMatchVerdict(JSON.parse(payload.slice(start, end + 1)));
    } catch {
      return null;
    }
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function countCodePoints(text: string): number {
  return Array.from(text).length;
}

export const JD_MARKDOWN_MIN_CHARS = 200;
