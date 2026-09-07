import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getSampleTemplates,
  pickLang,
  SAMPLE_RESUME_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from '@muicv/shared';

import { JsonLd } from '@/components/json-ld';

import { MarketingShell } from '@/app/(zh)/(marketing)/_content/marketing-shell';
import { ArrowUpRight, Highlight } from '@/app/(zh)/(marketing)/_icons';
import { pageMetadata } from '@/app/(zh)/(marketing)/_page-meta';

export const revalidate = 3600;

const SITE_URL = 'https://muicv.com';

export const metadata: Metadata = pageMetadata({
  locale: 'en',
  path: '/templates',
  title: 'Developer & Tech Resume Templates Hub (ATS-Optimized)',
  description:
    'Free developer resume templates and examples for Software Engineers, Frontend, Backend, Full Stack, AI/ML, Product, Design, and DevOps. Bilingual preview and A4 PDF export.',
});

const TEMPLATE_STYLE_LABELS: Record<string, string> = {
  't1-classic': 'Classic Elegant (2-Column)',
  't2-minimal': 'Minimal Modern (Clean Lines)',
  't3-sidebar': 'Sidebar Layout (Skill Focus)',
  't4-tech': 'Geek Tech (Stack Highlights)',
  't5-timeline': 'Timeline Style (Progression)',
  't6-academic': 'Academic & Research',
};

export default async function EnTemplatesIndexPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const resolvedParams = await searchParams;
  const activeCategory = (resolvedParams.category as TemplateCategory | 'all') || 'all';
  const templates = getSampleTemplates(activeCategory);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/en` },
      { '@type': 'ListItem', position: 2, name: 'Resume Templates', item: `${SITE_URL}/en/templates` },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MuiCV Developer & Tech Resume Templates Hub',
    description: 'ATS-friendly developer resume templates and examples for software engineers and digital talent.',
    url: `${SITE_URL}/en/templates`,
    hasPart: SAMPLE_RESUME_TEMPLATES.map((item) => ({
      '@type': 'DigitalDocument',
      name: item.name.en,
      url: `${SITE_URL}/en/templates/${item.slug}`,
      description: item.summary.en,
    })),
  };

  return (
    <MarketingShell locale="en" altHref="/templates">
      <JsonLd data={breadcrumbSchema} />

      <JsonLd data={collectionSchema} />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-rule bg-paper/45">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">
            Resume Templates Hub
          </p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
            Public Resume Templates for <Highlight>Software Engineers</Highlight> & Tech Talent.
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">
            Proven resume samples adapted from real top-tier offers. Packed with quantified impact bullets, clean
            ATS-friendly structures, and one-click A4 PDF export.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/en/download"
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[15px] font-bold text-ink"
            >
              Download Desktop App
              <ArrowUpRight />
            </a>
            <Link
              href="/posts/jobs/english-resume-for-chinese-developers"
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[15px] font-bold text-ink"
            >
              Read Action Verbs Guide
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>

      {/* Category Filter Tabs */}
      <section className="sticky top-[61px] z-20 border-b border-rule bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-5 py-3 md:px-8">
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const href = cat.key === 'all' ? '/en/templates' : `/en/templates?category=${cat.key}`;
            return (
              <Link
                key={cat.key}
                href={href}
                className={`shrink-0 rounded-lg px-3.5 py-1.5 text-[13px] font-bold transition ${
                  isActive
                    ? 'bg-ink text-cream shadow-sm'
                    : 'border border-rule bg-paper/60 text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {cat.label.en}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Templates Grid */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-ink-soft">
            Showing <span className="text-yellow-deep">{templates.length}</span> verified resume templates
          </p>
          <Link
            href="/posts/guide/how-to-optimize-resume-for-ats"
            className="text-[13px] font-bold text-yellow-deep hover:underline"
          >
            How ATS Screening Works →
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {templates.map((template) => {
            const styleLabel = TEMPLATE_STYLE_LABELS[template.templateId] || template.templateId;
            return (
              <div
                key={template.slug}
                className="group flex flex-col justify-between rounded-2xl border-2 border-rule bg-cream p-6 transition hover:border-ink hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2.5 py-1 text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: template.accent }}
                    >
                      {styleLabel}
                    </span>
                    <span className="font-mono text-[12px] uppercase text-mute">
                      {pickLang(template.data.name, 'en')}
                    </span>
                  </div>

                  <h2 className="mt-4 text-[20px] font-extrabold text-ink group-hover:text-yellow-deep">
                    <Link href={`/en/templates/${template.slug}`} prefetch={false}>
                      {template.name.en}
                    </Link>
                  </h2>
                  <p className="mt-1 text-[13px] font-bold text-ink-soft">{template.role.en}</p>

                  <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">{template.summary.en}</p>

                  <div className="mt-4 space-y-1.5 rounded-xl border border-rule-strong bg-paper/60 p-3.5 text-[12.5px] text-ink-soft">
                    {template.highlights.en.map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-yellow-deep font-bold">✓</span>
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {template.atsKeywords.slice(0, 6).map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md border border-rule bg-paper px-2 py-0.5 text-[11px] text-ink-soft"
                      >
                        {kw}
                      </span>
                    ))}
                    {template.atsKeywords.length > 6 && (
                      <span className="text-[11px] text-mute">+{template.atsKeywords.length - 6}</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-rule">
                  <Link
                    href={`/en/templates/${template.slug}`}
                    prefetch={false}
                    className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow py-2.5 text-[14px] font-bold text-ink"
                  >
                    View Template & Live Preview
                    <ArrowUpRight />
                  </Link>
                  <a
                    href="/en/download"
                    className="inline-flex items-center justify-center rounded-xl border-2 border-rule bg-paper px-4 py-2.5 text-[14px] font-bold text-ink hover:border-ink hover:bg-cream"
                    title="Download app and use template"
                  >
                    Use in App
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </MarketingShell>
  );
}
