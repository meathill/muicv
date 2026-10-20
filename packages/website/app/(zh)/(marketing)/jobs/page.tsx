import { isOneOf, JOB_KINDS, JOB_REGIONS, type JobListing, type JobSearchRequest, REMOTE_TYPES } from '@muicv/shared';
import type { Metadata } from 'next';

import { searchWebsiteJobs } from '@/lib/jobs';

import { MarketingShell } from '../_content/marketing-shell';
import { soloPageMetadata } from '../_page-meta';
import { KIND_TABS, REGION_LABEL, REMOTE_LABEL, SITE_LABEL } from './_labels';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = soloPageMetadata({
  path: '/jobs',
  title: '岗位库',
  description: '国际 / 远程技术岗与社区贡献 JD 合一，支持自然语言搜索，一键发到 Mui简历桌面端判断是否适合你投。',
});

type SearchParams = { q?: string; kind?: string; remote?: string; region?: string; page?: string };

function toRequest(params: SearchParams): JobSearchRequest {
  return {
    ...(params.q?.trim() ? { q: params.q.trim() } : {}),
    ...(isOneOf(JOB_KINDS, params.kind) ? { kind: params.kind } : {}),
    ...(isOneOf(REMOTE_TYPES, params.remote) ? { remote: params.remote } : {}),
    ...(isOneOf(JOB_REGIONS, params.region) ? { region: params.region } : {}),
    page: Math.max(Number(params.page) || 1, 1),
    pageSize: 20,
  };
}

function hrefWith(params: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...params, ...patch };
  const qs = new URLSearchParams(
    Object.entries(merged).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
    ),
  );
  const s = qs.toString();
  return s ? `/jobs?${s}` : '/jobs';
}

function detailHref(item: JobListing): string {
  const [, refId] = item.id.split(':');
  return item.kind === 'community' ? `/jobs/${refId}` : `/jobs/o/${refId}`;
}

function JobCard({ item }: { item: JobListing }) {
  const meta = [
    item.kind === 'community' ? '社区' : `via ${SITE_LABEL[item.source] ?? item.source}`,
    item.location,
    item.remote ? REMOTE_LABEL[item.remote] : '',
  ].filter(Boolean);
  return (
    <a
      href={detailHref(item)}
      className="block rounded-xl border-2 border-ink bg-cream px-4 py-3 no-underline shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5"
    >
      <p className="font-mono text-[12px] text-yellow-deep">{meta.join(' · ')}</p>
      <h2 className="mt-1 text-[16px] font-extrabold text-ink">{item.title}</h2>
      <p className="mt-0.5 text-[14px] text-ink-soft">
        {item.company} · {item.postedAt.slice(0, 10)}
      </p>
    </a>
  );
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const req = toRequest(params);
  const result = await searchWebsiteJobs(req);
  const items = result?.items ?? [];
  const page = req.page ?? 1;

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 机会</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight">岗位库</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-ink-soft">
          我们每天从知名科技公司的招聘板和远程岗位站收集新岗位，再加上求职者用浏览器扩展贡献的 JD（首次去重入库奖励
          token）。用一句话描述你想要的工作就能搜。我们不代替招聘站，也不自动投递。
        </p>

        <nav className="mt-8 flex gap-2" aria-label="来源">
          {KIND_TABS.map((tab) => {
            const active = (params.kind ?? '') === tab.value;
            return (
              <a
                key={tab.label}
                href={hrefWith(params, { kind: tab.value, page: '' })}
                className={`rounded-full border-2 border-ink px-3 py-1 text-[14px] font-bold no-underline ${active ? 'bg-yellow text-ink' : 'bg-cream text-ink-soft'}`}
              >
                {tab.label}
              </a>
            );
          })}
        </nav>

        <form className="mt-4 flex flex-wrap gap-2" method="get">
          {params.kind ? <input type="hidden" name="kind" value={params.kind} /> : null}
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="比如：欧洲远程的资深后端，Go 优先"
            className="min-w-0 flex-1 rounded-md border-2 border-ink bg-cream px-3 py-2 text-[14px] text-ink"
          />
          <select
            name="remote"
            defaultValue={params.remote ?? ''}
            className="rounded-md border-2 border-ink bg-cream px-2 py-2 text-[14px] text-ink"
          >
            <option value="">办公方式</option>
            {REMOTE_TYPES.map((v) => (
              <option key={v} value={v}>
                {REMOTE_LABEL[v]}
              </option>
            ))}
          </select>
          <select
            name="region"
            defaultValue={params.region ?? ''}
            className="rounded-md border-2 border-ink bg-cream px-2 py-2 text-[14px] text-ink"
          >
            <option value="">地区</option>
            {JOB_REGIONS.map((v) => (
              <option key={v} value={v}>
                {REGION_LABEL[v]}
              </option>
            ))}
          </select>
          <button type="submit" className="press rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink">
            搜索
          </button>
        </form>

        {result?.mode === 'keyword' && params.q ? (
          <p className="mt-4 text-[12px] text-mute">语义搜索暂时不可用，已退回关键词匹配。</p>
        ) : null}

        <ul className="mt-8 space-y-3">
          {items.length === 0 ? (
            <li className="rounded-xl border-2 border-rule bg-paper px-4 py-6 text-[14px] text-ink-soft">
              {result ? '没有匹配的岗位，换个说法或放宽条件试试。' : '岗位服务暂时不可用，请稍后再试。'}
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <JobCard item={item} />
              </li>
            ))
          )}
        </ul>

        <div className="mt-8 flex justify-between text-[14px]">
          {page > 1 ? <a href={hrefWith(params, { page: String(page - 1) })}>← 上一页</a> : <span />}
          {result?.hasMore ? <a href={hrefWith(params, { page: String(page + 1) })}>下一页 →</a> : null}
        </div>
      </main>
    </MarketingShell>
  );
}
