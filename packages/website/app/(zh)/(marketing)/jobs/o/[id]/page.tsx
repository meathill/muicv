import { isIndexableSource } from '@muicv/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getWebsiteOpportunity } from '@/lib/jobs';

import { MarketingShell } from '../../../_content/marketing-shell';
import { describeRestrictions, SITE_LABEL, WORKPLACE_LABEL } from '../../_labels';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const doc = await getWebsiteOpportunity(id);
  if (!doc) return { title: '岗位不存在', robots: { index: false, follow: false } };
  const isExpired = doc.status === 'expired';
  return {
    title: isExpired ? `${doc.title} · ${doc.company}（已下架）` : `${doc.title} · ${doc.company}`,
    description: isExpired
      ? '该岗位已下架，页面仅作存档。去 Mui简历 浏览其他在招岗位。'
      : doc.summary || `${doc.company} · ${doc.location}`,
    alternates: { canonical: `/jobs/o/${doc.id}` },
    // 过期岗位保留 200 存档，但不再让搜索引擎收录；第三方岗位板转载本来也 noindex。
    robots: !isExpired && isIndexableSource(doc.source) ? undefined : { index: false, follow: true },
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getWebsiteOpportunity(id);
  if (!doc) notFound();
  const isExpired = doc.status === 'expired';
  const sourceLabel = SITE_LABEL[doc.source] ?? doc.source;

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
          — {[WORKPLACE_LABEL[doc.workplace], describeRestrictions(doc)].filter(Boolean).join(' · ')}
        </p>
        <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold leading-[1.15] tracking-tight">
          {doc.title}
        </h1>
        <p className="mt-2 text-[16px] text-ink-soft">
          {doc.company}
          {doc.location ? ` · ${doc.location}` : ''} · 发布于 {doc.postedAt.slice(0, 10)}
          {isExpired ? ' · 已下架' : ''}
        </p>
        {isExpired ? (
          <div className="mt-6 rounded-md border-2 border-ink bg-cream p-4">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 岗位已下架</p>
            <p className="mt-1 text-[14px] text-ink-soft">
              该岗位已停止招聘，页面仅作存档。去{' '}
              <Link href="/jobs" className="font-bold underline">
                浏览在招岗位
              </Link>
              。
            </p>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`muicv://import-jd?opportunity=${encodeURIComponent(doc.id)}`}
            className="press inline-flex rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink no-underline"
          >
            用这个 JD
          </a>
          {isExpired ? null : (
            <a
              href={doc.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-md border-2 border-ink bg-cream px-4 py-2 text-[14px] font-bold text-ink no-underline"
            >
              去 {sourceLabel} 投递
            </a>
          )}
        </div>
        <article className="prose-mui mt-10 whitespace-pre-wrap text-[14px] leading-[1.7] text-ink">
          {doc.descriptionMarkdown}
        </article>
        <p className="mt-8 text-[12px] text-mute">
          本岗位由 Mui简历从 {sourceLabel} 公开岗位接口自动收集（via {sourceLabel}），以原帖为准。 权利人如需下架请联系
          hello@muicv.com。
        </p>
      </main>
    </MarketingShell>
  );
}
