import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSampleTemplateBySlug, pickLang, SAMPLE_RESUME_TEMPLATES } from '@muicv/shared';

import { JsonLd } from '@/components/json-ld';

import { MarketingShell } from '@/app/(zh)/(marketing)/_content/marketing-shell';
import { ArrowUpRight } from '@/app/(zh)/(marketing)/_icons';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';
import { TemplatePreviewViewer } from '@/app/(zh)/(marketing)/templates/template-preview-viewer';

export const revalidate = 3600;

const SITE_URL = 'https://muicv.com';

type Params = { slug: string };

export async function generateStaticParams() {
  return SAMPLE_RESUME_TEMPLATES.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const template = getSampleTemplateBySlug(slug);
  if (!template) return {};

  const baseMeta = pageMetadata({
    locale: 'en',
    path: `/templates/${template.slug}`,
    title: template.seoTitle.en,
    description: template.seoDescription.en,
  });

  return {
    ...baseMeta,
    keywords: template.atsKeywords,
  };
}

export default async function EnTemplateDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const template = getSampleTemplateBySlug(slug);
  if (!template) notFound();

  const pageUrl = `${SITE_URL}/en/templates/${template.slug}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Resume Templates', item: `${SITE_URL}/en/templates` },
      { '@type': 'ListItem', position: 3, name: template.name.en, item: pageUrl },
    ],
  };

  const documentSchema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    headline: template.name.en,
    name: template.name.en,
    description: template.summary.en,
    url: pageUrl,
    author: { '@type': 'Organization', name: 'MuiCV' },
    keywords: template.atsKeywords.join(', '),
  };

  const relatedTemplates = SAMPLE_RESUME_TEMPLATES.filter((item) => item.slug !== template.slug).slice(0, 2);

  return (
    <MarketingShell locale="en" altHref={`/templates/${template.slug}`}>
      <JsonLd data={breadcrumbSchema} />

      <JsonLd data={documentSchema} />

      {/* Header */}
      <header className="border-b border-rule bg-paper/50">
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
          <Link href="/en/templates" className="text-[13px] font-bold text-yellow-deep hover:text-ink">
            ← Back to Templates Hub
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-md px-2.5 py-1 text-[11px] font-extrabold text-white"
              style={{ backgroundColor: template.accent }}
            >
              Layout: {template.templateId}
            </span>
            <span className="font-mono text-[12px] uppercase text-mute">
              {pickLang(template.data.name, 'en')} · {pickLang(template.data.title, 'en')}
            </span>
          </div>

          <h1 className="mt-3 text-[clamp(1.85rem,4.5vw,3rem)] font-extrabold leading-[1.12] tracking-tight text-ink">
            {template.name.en}
          </h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-[1.7] text-ink-soft">{template.summary.en}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/en/download"
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[14px] font-bold text-ink"
            >
              Download App to Use Template
              <ArrowUpRight />
            </a>
            <Link
              href="/posts/jobs/english-resume-for-chinese-developers"
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[14px] font-bold text-ink"
            >
              Action Verbs Guide
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </header>

      {/* Main View */}
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <div className="space-y-12">
          {/* Live A4 Viewer */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold text-ink">
                Live A4 Resume Preview (Bilingual English / Chinese)
              </h2>
              <span className="text-[12px] text-mute">Toggle language or copy raw JSON</span>
            </div>
            <div className="flex justify-center rounded-2xl border-2 border-rule bg-paper/70 p-4 md:p-8">
              <TemplatePreviewViewer
                templateId={template.templateId}
                resume={template.data}
                accent={template.accent}
                initialLang="en"
              />
            </div>
          </section>

          {/* Highlights */}
          <section className="rounded-2xl border-2 border-rule bg-cream p-6 md:p-8">
            <h2 className="text-[20px] font-extrabold text-ink">💡 Why This Resume Works · Highlights Breakdown</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {template.highlights.en.map((highlight, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-rule bg-paper/60 p-4 text-[13.5px] leading-[1.65] text-ink-soft"
                >
                  <p className="font-mono text-[11px] font-extrabold text-yellow-deep">POINT 0{idx + 1}</p>
                  <p className="mt-2 text-ink">{highlight}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ATS Keywords */}
          <section className="rounded-2xl border-2 border-rule bg-paper/60 p-6 md:p-8">
            <h2 className="text-[18px] font-extrabold text-ink">🔍 Target ATS & Job Keywords Checklist</h2>
            <p className="mt-2 text-[13.5px] text-ink-soft">
              Ensure your experience statements incorporate these high-density keywords when applying for related roles:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {template.atsKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-lg border border-rule-strong bg-cream px-3 py-1.5 text-[12.5px] font-bold text-ink"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </section>

          {/* Related Templates */}
          <section className="border-t border-rule pt-10">
            <h3 className="text-[16px] font-extrabold text-ink">Explore More Roles & Layouts:</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {relatedTemplates.map((item) => (
                <Link
                  key={item.slug}
                  href={`/en/templates/${item.slug}`}
                  className="flex items-center justify-between rounded-xl border-2 border-rule bg-cream p-4 hover:border-ink"
                >
                  <div>
                    <p className="text-[15px] font-bold text-ink">{item.name.en}</p>
                    <p className="text-[12px] text-ink-soft">{item.role.en}</p>
                  </div>
                  <span className="text-[13px] font-bold text-yellow-deep">View →</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
