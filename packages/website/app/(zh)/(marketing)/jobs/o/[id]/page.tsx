import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getWebsiteOpportunity } from '@/lib/jobs';

import { MarketingShell } from '../../../_content/marketing-shell';
import { describeRestrictions, SITE_LABEL, WORKPLACE_LABEL } from '../../_labels';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const doc = await getWebsiteOpportunity(id);
  if (!doc) return { title: '岗位不存在', robots: { index: false, follow: false } };
  return {
    title: `${doc.title} · ${doc.company}`,
    description: doc.summary || `${doc.company} · ${doc.location}`,
    alternates: { canonical: `/jobs/o/${doc.id}` },
    // Remotive 条款不允许转投搜索引擎：noindex
    robots: doc.source === 'remotive' ? { index: false, follow: true } : undefined,
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getWebsiteOpportunity(id);
  if (!doc) notFound();
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
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`muicv://import-jd?opportunity=${encodeURIComponent(doc.id)}`}
            className="press inline-flex rounded-md bg-yellow px-4 py-2 text-[14px] font-bold text-ink no-underline"
          >
            用这个 JD
          </a>
          <a
            href={doc.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md border-2 border-ink bg-cream px-4 py-2 text-[14px] font-bold text-ink no-underline"
          >
            去 {sourceLabel} 投递
          </a>
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
