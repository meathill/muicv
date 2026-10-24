import {
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  PuzzlePieceIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';

import type { AppSkillCatalogItem, SkillsCatalogResult } from '../../../shared/types.ts';

function availabilityLabel(skill: AppSkillCatalogItem): string {
  if (skill.appAvailability === 'built_in') return '已内置';
  if (skill.appAvailability === 'link_only') return '官方来源';
  if (skill.appAvailability === 'installable') return '可安装';
  return '整理中';
}

function actionLabel(skill: AppSkillCatalogItem): string {
  if (skill.appAvailability === 'built_in') return '查看详情';
  if (skill.appAvailability === 'link_only') return '查看来源';
  if (skill.appAvailability === 'installable') return '接入';
  return '查看说明';
}

function actionHref(skill: AppSkillCatalogItem): string {
  return skill.detailUrl;
}

export function SkillMarketCard() {
  const [result, setResult] = useState<SkillsCatalogResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await window.muicv.skills.catalog());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const skills = result?.ok ? result.skills : [];

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-yellow text-ink">
            <PuzzlePieceIcon size={19} weight="bold" />
          </div>
          <div>
            <h3 className="text-[16px] font-extrabold text-ink">Skill 市场</h3>
            <p className="mt-1 text-[12px] leading-[1.6] text-ink-soft">
              收集 Mui 内置能力和第三方官方 skill。外部能力先做来源索引，能安装的条目会明确标注。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadCatalog()}
          disabled={loading}
          title="刷新目录"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rule bg-paper text-ink-soft hover:border-rule-strong hover:bg-fluff hover:text-ink disabled:opacity-60"
        >
          <ArrowsClockwiseIcon size={15} weight="bold" className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {result && !result.ok ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rule bg-paper p-3 text-[12px] text-ink-soft">
          <WarningCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-tongue" />
          <span>{result.message}</span>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {loading && skills.length === 0 ? (
          <div className="rounded-lg border border-rule bg-paper p-3 text-[12px] text-mute">正在读取目录...</div>
        ) : null}

        {skills.map((skill) => (
          <SkillRow key={skill.slug} skill={skill} />
        ))}
      </div>
    </section>
  );
}

function SkillRow({ skill }: { skill: AppSkillCatalogItem }) {
  const href = actionHref(skill);
  const isBuiltIn = skill.appAvailability === 'built_in';

  return (
    <article className="rounded-lg border border-rule bg-paper/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[14px] font-extrabold text-ink">{skill.title}</h4>
            <span className="rounded-full border border-rule bg-cream px-2 py-0.5 text-[11px] font-semibold text-mute">
              {availabilityLabel(skill)}
            </span>
          </div>
          <p className="mt-1 text-[12px] leading-[1.55] text-ink-soft">{skill.summary}</p>
          {skill.sourceNote ? <p className="mt-2 text-[12px] leading-[1.5] text-ink-soft">{skill.sourceNote}</p> : null}
          {skill.disclaimer ? <p className="mt-2 text-[12px] leading-[1.5] text-mute">{skill.disclaimer}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void window.muicv.shell.openExternal(href)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rule-strong bg-cream px-2.5 py-1.5 text-[12px] font-bold text-ink hover:bg-fluff"
        >
          {isBuiltIn ? <CheckCircleIcon size={13} weight="bold" /> : <ArrowSquareOutIcon size={13} weight="bold" />}
          {actionLabel(skill)}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {skill.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-mute">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
