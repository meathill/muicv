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

import { MarketingShell } from '../_content/marketing-shell';
import { ArrowUpRight, Highlight } from '../_icons';
import { pageMetadata } from '../_page-meta';

export const revalidate = 3600;

const SITE_URL = 'https://muicv.com';

export const metadata: Metadata = pageMetadata({
  locale: 'zh',
  path: '/templates',
  title: '程序员与科技人才简历模板库 · 专为 ATS 与技术面试优化',
  description:
    '免费浏览并使用 8 套高质量程序员与技术岗位简历模板（前端、后端架构、全栈、AI大模型、产品经理、UI/UX、数据科学、DevOps）。支持中英双语切换与一键导出 A4 PDF。',
});

const TEMPLATE_STYLE_LABELS: Record<string, string> = {
  't1-classic': '经典优雅 (双栏/顶栏)',
  't2-minimal': '极简现代 (清爽排版)',
  't3-sidebar': '侧边信息栏 (突出技能)',
  't4-tech': '极客科技 (技术栈高亮)',
  't5-timeline': '时间轴风格 (经历演进)',
  't6-academic': '学术研究 (论文与著作)',
};

export default async function TemplatesIndexPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const resolvedParams = await searchParams;
  const activeCategory = (resolvedParams.category as TemplateCategory | 'all') || 'all';
  const templates = getSampleTemplates(activeCategory);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '简历模板库', item: `${SITE_URL}/templates` },
    ],
  };

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MuiCV 程序员与科技人才简历模板库',
    description: '涵盖前端、后端、全栈、AI、产品、设计等技术岗位的 ATS 优化简历模板与范文。',
    url: `${SITE_URL}/templates`,
    hasPart: SAMPLE_RESUME_TEMPLATES.map((item) => ({
      '@type': 'DigitalDocument',
      name: item.name.zh,
      url: `${SITE_URL}/templates/${item.slug}`,
      description: item.summary.zh,
    })),
  };

  return (
    <MarketingShell locale="zh" altHref="/en/templates">
      <JsonLd data={breadcrumbSchema} />

      <JsonLd data={collectionSchema} />

      {/* Hero 区域 */}
      <section className="relative overflow-hidden border-b border-rule bg-paper/45">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">
            Resume Templates Hub
          </p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight text-ink">
            为程序员与数字化人才打造的 <Highlight>公开简历模板库</Highlight>。
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">
            脱敏自真实大厂 Offer 履历，内置 React、Go、AI 大模型、SaaS 产品等深度量化案例。支持中英双语即时切换、ATS
            关键词智能适配与标准 A4 PDF 导出。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/download"
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[15px] font-bold text-ink"
            >
              下载桌面 App 一键套用
              <ArrowUpRight />
            </a>
            <Link
              href="/posts/jobs/ai-resume-tips-for-developers"
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[15px] font-bold text-ink"
            >
              查看 AI 写简历技巧
              <ArrowUpRight />
            </Link>
          </div>
        </div>
      </section>

      {/* 岗位分类筛选 Tab */}
      <section className="sticky top-[61px] z-20 border-b border-rule bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-5 py-3 md:px-8">
          {TEMPLATE_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const href = cat.key === 'all' ? '/templates' : `/templates?category=${cat.key}`;
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
                {cat.label.zh}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 模板卡片列表 */}
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold text-ink-soft">
            展示 <span className="text-yellow-deep">{templates.length}</span> 套专业简历模板
          </p>
          <Link
            href="/posts/guide/how-to-optimize-resume-for-ats"
            className="text-[13px] font-bold text-yellow-deep hover:underline"
          >
            什么是 ATS 简历筛选？ →
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
                  {/* 顶部标签 */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2.5 py-1 text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: template.accent }}
                    >
                      {styleLabel}
                    </span>
                    <span className="font-mono text-[12px] uppercase text-mute">
                      {pickLang(template.data.name, 'zh')} / {pickLang(template.data.name, 'en')}
                    </span>
                  </div>

                  {/* 标题与角色 */}
                  <h2 className="mt-4 text-[20px] font-extrabold text-ink group-hover:text-yellow-deep">
                    <Link href={`/templates/${template.slug}`} prefetch={false}>
                      {template.name.zh}
                    </Link>
                  </h2>
                  <p className="mt-1 text-[13px] font-bold text-ink-soft">{template.role.zh}</p>

                  {/* 简介 */}
                  <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">{template.summary.zh}</p>

                  {/* 亮点列表 */}
                  <div className="mt-4 space-y-1.5 rounded-xl border border-rule-strong bg-paper/60 p-3.5 text-[12.5px] text-ink-soft">
                    {template.highlights.zh.map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-yellow-deep font-bold">✓</span>
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* ATS 关键词 */}
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

                {/* 底部按钮栏 */}
                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-rule">
                  <Link
                    href={`/templates/${template.slug}`}
                    prefetch={false}
                    className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-yellow py-2.5 text-[14px] font-bold text-ink"
                  >
                    查看完整模板 & 双语预览
                    <ArrowUpRight />
                  </Link>
                  <a
                    href="/download"
                    className="inline-flex items-center justify-center rounded-xl border-2 border-rule bg-paper px-4 py-2.5 text-[14px] font-bold text-ink hover:border-ink hover:bg-cream"
                    title="在桌面 App 中一键套用"
                  >
                    套用制作
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEO 知识与指南模块 */}
      <section className="border-t border-rule bg-paper/50 py-16">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">
              Resume Guide & Best Practices
            </p>
            <h2 className="mt-2 text-[28px] font-extrabold text-ink">
              为什么技术人员的简历需要专门的 ATS 与版式设计？
            </h2>
            <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
              普通设计模板往往包含图表、不可选取的浮动文本框和非标排版，这会导致大厂的
              ATS（求职者追踪系统）在初筛抽取文本时产生严重乱码。
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-rule bg-cream p-5">
              <div className="text-[24px]">🎯</div>
              <h3 className="mt-3 text-[16px] font-bold text-ink">100% 机器解析兼容</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-ink-soft">
                MuiCV 模板采用标准语义化文档层级，导出的 PDF 包含完整矢量文字图层，确保被招聘系统与 HR
                搜索算法精确识别。
              </p>
            </div>

            <div className="rounded-xl border border-rule bg-cream p-5">
              <div className="text-[24px]">🌐</div>
              <h3 className="mt-3 text-[16px] font-bold text-ink">中英双语同步维护</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-ink-soft">
                一次录入经历，即可一键在中文版与符合外企/Remote 规范的英文版之间无缝切换，再也不用手动同步两份 Word
                文档。
              </p>
            </div>

            <div className="rounded-xl border border-rule bg-cream p-5">
              <div className="text-[24px]">🔒</div>
              <h3 className="mt-3 text-[16px] font-bold text-ink">原子素材本地掌控</h3>
              <p className="mt-2 text-[13px] leading-[1.65] text-ink-soft">
                所有职业履历、项目细节存放在你本地的原子素材库中。针对不同岗位 JD，由 AI 协助量化提炼，隐私安全可控。
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
