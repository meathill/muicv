import type { Metadata } from 'next';

import { listPublishedJds } from '@/lib/community-jd';

import { MarketingShell } from '../_content/marketing-shell';
import { soloPageMetadata } from '../_page-meta';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = soloPageMetadata({
  path: '/jobs',
  title: '岗位库',
  description: '社区贡献的招聘 JD。浏览、搜索，一键发到 Mui简历桌面端判断是否适合你投。',
});

const SITE_LABEL: Record<string, string> = {
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
  generic: '其他',
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; site?: string }> }) {
  const params = await searchParams;
  const items = await listPublishedJds({ q: params.q, site: params.site });

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 社区</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight">岗位库</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-ink-soft">
          求职者主动贡献的 JD。安装浏览器扩展后，在招聘页点一下就能收录；首次去重入库会奖励
          token。我们不代替招聘站，也不自动投递。
        </p>

        <form className="mt-8 flex gap-2" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="搜公司、职位、关键词"
            className="min-w-0 flex-1 rounded-md border-2 border-ink bg-cream px-3 py-2 text-[14px] text-ink"
          />
          <button type="submit" className="press rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink">
            搜索
          </button>
        </form>

        <ul className="mt-8 space-y-3">
          {items.length === 0 ? (
            <li className="rounded-xl border-2 border-rule bg-paper px-4 py-6 text-[14px] text-ink-soft">
              还没有岗位。装上扩展，打开一份 JD，点「贡献给社区」。
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <a
                  href={`/jobs/${item.id}`}
                  className="block rounded-xl border-2 border-ink bg-cream px-4 py-3 no-underline shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5"
                >
                  <p className="font-mono text-[12px] text-yellow-deep">
                    {SITE_LABEL[item.sourceSite] ?? item.sourceSite}
                    {item.location ? ` · ${item.location}` : ''}
                  </p>
                  <h2 className="mt-1 text-[16px] font-extrabold text-ink">{item.title ?? '未命名岗位'}</h2>
                  <p className="mt-0.5 text-[14px] text-ink-soft">{item.company ?? '未知公司'}</p>
                </a>
              </li>
            ))
          )}
        </ul>
      </main>
    </MarketingShell>
  );
}
