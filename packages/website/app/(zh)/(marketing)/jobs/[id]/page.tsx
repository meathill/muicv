import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPublishedJd } from '@/lib/community-jd';

import { MarketingShell } from '../../_content/marketing-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await getPublishedJd(id);
  if (!row) return { title: '岗位不存在', robots: { index: false, follow: false } };
  return {
    title: `${row.title ?? '岗位'} · ${row.company ?? 'Mui简历'}`,
    description: row.location ? `${row.company ?? ''} · ${row.location}` : (row.company ?? '社区贡献的岗位 JD'),
    robots: { index: false, follow: false },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getPublishedJd(id);
  if (!row) notFound();

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {row.sourceSite}</p>
        <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.15] tracking-tight">
          {row.title ?? '未命名岗位'}
        </h1>
        <p className="mt-2 text-[16px] text-ink-soft">
          {row.company ?? '未知公司'}
          {row.location ? ` · ${row.location}` : ''}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`muicv://import-jd?id=${encodeURIComponent(row.id)}`}
            className="press inline-flex rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink no-underline"
          >
            用这个 JD
          </a>
          <a
            href={row.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md border-2 border-ink bg-cream px-4 py-2 text-[14px] font-bold text-ink no-underline"
          >
            打开原帖
          </a>
        </div>
        <article className="prose-mui mt-10 whitespace-pre-wrap text-[14px] leading-[1.7] text-ink">
          {row.markdown}
        </article>
        <p className="mt-8 text-[12px] text-mute">
          本页内容由用户贡献，Mui简历不保证时效与准确性。权利人如需下架请联系 hello@muicv.com。
        </p>
      </main>
    </MarketingShell>
  );
}
