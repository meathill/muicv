import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSampleTemplateBySlug, pickLang, SAMPLE_RESUME_TEMPLATES } from '@muicv/shared';

import { JsonLd } from '@/components/json-ld';

import { MarketingShell } from '../../_content/marketing-shell';
import { ArrowUpRight, Highlight } from '../../_icons';
import { soloPageMetadata } from '../../_page-meta';
import { TemplatePreviewViewer } from '../template-preview-viewer';

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

  const baseMeta = soloPageMetadata({
    path: `/templates/${template.slug}`,
    title: template.seoTitle.zh,
    description: template.seoDescription.zh,
  });

  return {
    ...baseMeta,
    keywords: template.atsKeywords,
    alternates: {
      canonical: `/templates/${template.slug}`,
      languages: {
        'zh-CN': `/templates/${template.slug}`,
        en: `/en/templates/${template.slug}`,
        'x-default': `/templates/${template.slug}`,
      },
    },
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const template = getSampleTemplateBySlug(slug);
  if (!template) notFound();

  const pageUrl = `${SITE_URL}/templates/${template.slug}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '简历模板库', item: `${SITE_URL}/templates` },
      { '@type': 'ListItem', position: 3, name: template.name.zh, item: pageUrl },
    ],
  };

  const documentSchema = {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    headline: template.name.zh,
    name: template.name.zh,
    description: template.summary.zh,
    url: pageUrl,
    author: { '@type': 'Organization', name: 'MuiCV' },
    keywords: template.atsKeywords.join(', '),
  };

  // 获取同类或推荐的其他模板
  const relatedTemplates = SAMPLE_RESUME_TEMPLATES.filter((item) => item.slug !== template.slug).slice(0, 2);

  return (
    <MarketingShell locale="zh" altHref={`/en/templates/${template.slug}`}>
      <JsonLd data={breadcrumbSchema} />

      <JsonLd data={documentSchema} />

      {/* 头部导航与标题栏 */}
      <header className="border-b border-rule bg-paper/50">
        <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
          <Link href="/templates" className="text-[13px] font-bold text-yellow-deep hover:text-ink">
            ← 返回公开模板库
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-md px-2.5 py-1 text-[11px] font-extrabold text-white"
              style={{ backgroundColor: template.accent }}
            >
              版式: {template.templateId}
            </span>
            <span className="font-mono text-[12px] uppercase text-mute">
              {pickLang(template.data.name, 'zh')} · {pickLang(template.data.title, 'zh')}
            </span>
          </div>

          <h1 className="mt-3 text-[clamp(1.85rem,4.5vw,3rem)] font-extrabold leading-[1.12] tracking-tight text-ink">
            {template.name.zh}
          </h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-[1.7] text-ink-soft">{template.summary.zh}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/download"
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[14px] font-bold text-ink"
            >
              下载桌面 App 一键导入此模板
              <ArrowUpRight />
            </a>
            <Link
              href="/posts/jobs/ai-resume-tips-for-developers"
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[14px] font-bold text-ink"
            >
              AI 写简历实战技巧
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </header>

      {/* 主体内容：左侧/上方为交互式 A4 预览，右侧/下方为深度拆解 */}
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <div className="space-y-12">
          {/* A4 交互式双语预览器 */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-extrabold text-ink">实时 A4 简历视窗（支持中英双语即时切换）</h2>
              <span className="text-[12px] text-mute">可点击上方按钮切换语言或复制 JSON</span>
            </div>
            <div className="flex justify-center rounded-2xl border-2 border-rule bg-paper/70 p-4 md:p-8">
              <TemplatePreviewViewer
                templateId={template.templateId}
                resume={template.data}
                accent={template.accent}
                initialLang="zh"
              />
            </div>
          </section>

          {/* 简历亮点拆解 (Why It Works) */}
          <section className="rounded-2xl border-2 border-rule bg-cream p-6 md:p-8">
            <h2 className="text-[20px] font-extrabold text-ink">💡 为什么这份简历能通过初筛？亮点深度拆解</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {template.highlights.zh.map((highlight, idx) => (
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

          {/* ATS 关键词覆盖 */}
          <section className="rounded-2xl border-2 border-rule bg-paper/60 p-6 md:p-8">
            <h2 className="text-[18px] font-extrabold text-ink">🔍 ATS 招聘系统匹配关键词（Keywords Checklist）</h2>
            <p className="mt-2 text-[13.5px] text-ink-soft">
              在投递相关岗位时，建议确保简历的经历描述中自然覆盖以下技术栈与业务场景词汇：
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

          {/* 推荐其他岗位模板 */}
          <section className="border-t border-rule pt-10">
            <h3 className="text-[16px] font-extrabold text-ink">浏览更多技术岗位简历模板：</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {relatedTemplates.map((item) => (
                <Link
                  key={item.slug}
                  href={`/templates/${item.slug}`}
                  className="flex items-center justify-between rounded-xl border-2 border-rule bg-cream p-4 hover:border-ink"
                >
                  <div>
                    <p className="text-[15px] font-bold text-ink">{item.name.zh}</p>
                    <p className="text-[12px] text-ink-soft">{item.role.zh}</p>
                  </div>
                  <span className="text-[13px] font-bold text-yellow-deep">查看 →</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
