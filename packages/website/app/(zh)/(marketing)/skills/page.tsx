import type { Metadata } from 'next';
import { getWebsitePublishedSkills } from '@/lib/cms-content';

import { ContentCard } from '../_content/content-card';
import { MarketingShell } from '../_content/marketing-shell';
import { Highlight } from '../_icons';
import { soloPageMetadata } from '../_page-meta';

export const metadata: Metadata = soloPageMetadata({
  path: '/skills',
  title: 'Skill 目录',
  description: 'Mui 简历收集的求职相关 skill：自有内置能力、第三方官方来源索引和后续可安装扩展。',
});

export const revalidate = 3600;

export default async function SkillsPage() {
  const skills = await getWebsitePublishedSkills();

  return (
    <MarketingShell>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">Skill catalog</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            把求职相关 skill 收进一个 <Highlight>目录</Highlight>。
          </h1>
          <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">
            这里既有 Mui app 内置 skill，也有经过 Payload
            管理的第三方官方来源索引。能否安装、如何使用会明确标注，不把索引写成已经可接入。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {skills.map((skill) => (
            <ContentCard
              key={skill.slug}
              href={`/skills/${skill.slug}`}
              eyebrow={skill.publisher}
              title={skill.title}
              summary={skill.summary}
              tags={skill.tags}
            />
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
