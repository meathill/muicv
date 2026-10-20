import { htmlToText } from '@muicv/shared';

import type { RawJob } from '../normalize.ts';
import { asRecord, asString, type FetchLike, fetchJson } from './fetch-json.ts';
import { cleanUrl, fetchRss, type RssItem } from './rss.ts';

/**
 * 垂直 / 远程岗位板适配器（官方 RSS / JSON，2026-10-20 核对 robots 与条款，结论见 DEV_NOTE）。
 * 共同约束：applyUrl 一律用**岗位板上的原帖 URL**（链回 + 注明来源），不直链雇主 ATS；
 * 详情页 noindex、不进 sitemap（shared `isIndexableSource`）。
 */

function slugId(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\/+|\/+$/g, '') || url;
  } catch {
    return url;
  }
}

/** 「<strong>Location:</strong> New York」这类 description 里的字段 */
function labeled(text: string, label: string): string {
  return new RegExp(`${label}:\\s*([^\\n]+)`, 'i').exec(text)?.[1]?.trim() ?? '';
}

/** VueJobs：https://vuejobs.com/feed（description 里带 Employer / Location） */
export async function fetchVueJobs(fetchImpl: FetchLike): Promise<RawJob[]> {
  const items = await fetchRss(fetchImpl, 'https://vuejobs.com/feed');
  return items.map((item) => {
    const text = htmlToText(item.get('description'));
    const url = cleanUrl(item.get('guid') || item.get('link'));
    return {
      source: 'vuejobs',
      sourceId: slugId(url),
      title: item.get('title'),
      company: labeled(text, 'Employer'),
      location: labeled(text, 'Location'),
      plain: text,
      applyUrl: url,
      postedAt: item.get('pubDate'),
      tags: ['vue'],
    } satisfies RawJob;
  });
}

/** LaraJobs：https://larajobs.com/feed（job:company / job:location / job:tags 扩展字段） */
export async function fetchLaraJobs(fetchImpl: FetchLike): Promise<RawJob[]> {
  const items = await fetchRss(fetchImpl, 'https://larajobs.com/feed');
  return items.map((item) => {
    const url = cleanUrl(item.get('link'));
    const location = item.get('job:location');
    const tags = item
      .get('job:tags')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      source: 'larajobs',
      sourceId: slugId(url),
      title: item.get('title'),
      company: item.get('job:company') || item.get('dc:creator'),
      location,
      // LaraJobs 正文为空：用地点 + 标签作为可检索文本
      plain: [location, tags.join(', '), htmlToText(item.get('content:encoded'))].filter(Boolean).join('\n'),
      employmentType: item.get('job:job_type') || undefined,
      applyUrl: url,
      postedAt: item.get('pubDate'),
      tags: ['laravel', ...tags],
    } satisfies RawJob;
  });
}

/** We Work Remotely 分类 RSS：标题是「Company: Title」，<region> 为候选人地域 */
export async function fetchWeWorkRemotely(fetchImpl: FetchLike, category: string): Promise<RawJob[]> {
  const items = await fetchRss(fetchImpl, `https://weworkremotely.com/categories/${category}.rss`);
  return items.map((item: RssItem) => {
    const full = item.get('title');
    const idx = full.indexOf(':');
    const url = cleanUrl(item.get('link') || item.get('guid'));
    return {
      source: 'weworkremotely',
      sourceId: slugId(url),
      title: idx > 0 ? full.slice(idx + 1).trim() : full,
      company: idx > 0 ? full.slice(0, idx).trim() : '',
      location: item.get('region') || 'Remote',
      workplace: 'remote',
      isRemote: true,
      html: item.get('description'),
      applyUrl: url,
      postedAt: item.get('pubDate'),
      tags: [item.get('category')].filter(Boolean),
    } satisfies RawJob;
  });
}

/**
 * Remote OK 的 JSON 有时把 UTF-8 字节按 Latin-1 再编码了一次（`Sotheby’s` → `Sothebyâ\u0080\u0099s`）。
 * 只有全部字符 ≤ 0xFF 且能按 UTF-8 严格解码时才还原，避免误伤正常文本。
 */
export function fixMojibake(text: string): string {
  if (!/[\u00c2-\u00f4][\u0080-\u00bf]/.test(text)) return text;
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0xff) return text;
    bytes[i] = code;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return text;
  }
}

/**
 * Remote OK：https://remoteok.com/api（首项为 legal 声明）。
 * 条款：必须链回 Remote OK 原帖（不带 nofollow）并注明 Remote OK；不得使用其 logo。
 */
export async function fetchRemoteOk(fetchImpl: FetchLike): Promise<RawJob[]> {
  const body = await fetchJson(fetchImpl, 'https://remoteok.com/api');
  const list = Array.isArray(body) ? body : [];
  return list
    .map(asRecord)
    .filter((j) => j.id !== undefined && j.position !== undefined)
    .map((j) => ({
      source: 'remoteok',
      sourceId: asString(j.id),
      title: fixMojibake(asString(j.position)),
      company: fixMojibake(asString(j.company)),
      location: fixMojibake(asString(j.location)) || 'Remote',
      workplace: 'remote',
      isRemote: true,
      html: fixMojibake(asString(j.description)),
      applyUrl: asString(j.url),
      postedAt: asString(j.date) || Number(j.epoch) * 1000,
      tags: Array.isArray(j.tags) ? j.tags.map(asString).filter(Boolean) : [],
    }));
}

/**
 * Himalayas：https://himalayas.app/jobs/api（每页 ≤20，cursor 翻页）。
 * 条款：API 明确允许回填其他岗位板，须链回 Himalayas 原帖并注明来源。
 * locationRestrictions 是国家名数组、timezoneRestrictions 是 UTC 小时数组，直接用作地域限制。
 */
export async function fetchHimalayas(fetchImpl: FetchLike, pages: number): Promise<RawJob[]> {
  const out: RawJob[] = [];
  let cursor = '';
  for (let i = 0; i < pages; i++) {
    const url = `https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const body = asRecord(await fetchJson(fetchImpl, url));
    const jobs = Array.isArray(body.jobs) ? body.jobs.map(asRecord) : [];
    for (const j of jobs) {
      const countries = Array.isArray(j.locationRestrictions) ? j.locationRestrictions.map(asString) : [];
      const zones = Array.isArray(j.timezoneRestrictions)
        ? j.timezoneRestrictions.filter((z): z is number => typeof z === 'number')
        : [];
      const link = cleanUrl(asString(j.guid) || asString(j.applicationLink));
      out.push({
        source: 'himalayas',
        sourceId: slugId(link),
        title: asString(j.title),
        company: asString(j.companyName),
        location: countries.length ? countries.join(', ') : 'Remote, Worldwide',
        workplace: 'remote',
        isRemote: true,
        html: asString(j.description) || asString(j.excerpt),
        employmentType: asString(j.employmentType) || undefined,
        applyUrl: link,
        postedAt: typeof j.pubDate === 'number' ? j.pubDate * 1000 : asString(j.pubDate),
        tags: Array.isArray(j.categories) ? j.categories.map(asString).slice(0, 5) : [],
        utcRange: zones.length && zones.length < 24 ? [Math.min(...zones), Math.max(...zones)] : null,
      });
    }
    cursor = asString(body.nextCursor);
    if (!cursor || jobs.length === 0) break;
  }
  return out;
}

/**
 * Jobicy：https://jobicy.com/api/v2/remote-jobs（公开，近 7 天）。
 * 条款（Fair use）：保留 Jobicy 原帖 URL、注明 Jobicy 为来源，申请按钮跳原帖。
 */
export async function fetchJobicy(fetchImpl: FetchLike, industry: string): Promise<RawJob[]> {
  const body = asRecord(
    await fetchJson(fetchImpl, `https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`),
  );
  const jobs = Array.isArray(body.jobs) ? body.jobs.map(asRecord) : [];
  return jobs.map((j) => ({
    source: 'jobicy',
    sourceId: asString(j.id),
    title: asString(j.jobTitle),
    company: asString(j.companyName),
    location: asString(j.jobGeo) || 'Remote',
    workplace: 'remote',
    isRemote: true,
    html: asString(j.jobDescription) || asString(j.jobExcerpt),
    employmentType: Array.isArray(j.jobType) ? asString(j.jobType[0]) || undefined : undefined,
    applyUrl: asString(j.url),
    postedAt: asString(j.pubDate),
    tags: Array.isArray(j.jobIndustry) ? j.jobIndustry.map(asString) : [],
  }));
}

/** Golangprojects：https://www.golangprojects.com/rss.xml，标题「Title @ Company」，描述以「Remote - 」等地点开头 */
export async function fetchGolangProjects(fetchImpl: FetchLike): Promise<RawJob[]> {
  const items = await fetchRss(fetchImpl, 'https://www.golangprojects.com/rss.xml');
  return items.map((item) => {
    const full = item.get('title');
    // 分隔符两侧可能是不换行空格
    const at = full.search(/\s@\s(?!.*\s@\s)/u);
    const description = htmlToText(item.get('description'));
    const dash = description.indexOf(' - ');
    const url = cleanUrl(item.get('link') || item.get('guid'));
    return {
      source: 'golangprojects',
      sourceId: slugId(url),
      title: at > 0 ? full.slice(0, at).trim() : full,
      company:
        at > 0
          ? full
              .slice(at)
              .replace(/^\s@\s/u, '')
              .trim()
          : '',
      location: dash > 0 && dash < 60 ? description.slice(0, dash).trim() : '',
      plain: description,
      applyUrl: url,
      // feed 不带 pubDate：以抓取时间为准（dedupeKey 幂等，只在首次入库时记录）
      postedAt: item.get('pubDate') || Date.now(),
      tags: ['go'],
    } satisfies RawJob;
  });
}
