'use client';

import { useState } from 'react';
import type { TemplateId, TemplateLang, TemplateResumeData } from '@muicv/shared';

import { jsonTemplates } from '../../r/render/[token]/templates/registry';

export type TemplatePreviewViewerProps = {
  templateId: Exclude<TemplateId, 'default'>;
  resume: TemplateResumeData;
  accent?: string;
  initialLang?: TemplateLang;
  showControls?: boolean;
};

export function TemplatePreviewViewer({
  templateId,
  resume,
  accent,
  initialLang = 'zh',
  showControls = true,
}: TemplatePreviewViewerProps) {
  const [lang, setLang] = useState<TemplateLang>(initialLang);
  const [copied, setCopied] = useState(false);

  const TemplateComponent = jsonTemplates[templateId] || jsonTemplates['t1-classic'];

  function handleCopyJson() {
    navigator.clipboard.writeText(JSON.stringify(resume, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col items-center">
      {showControls && (
        <div className="mb-6 flex w-full max-w-[794px] flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-rule bg-cream/90 px-4 py-2.5 shadow-sm backdrop-blur">
          {/* 语言切换 */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-ink-soft">语言视图:</span>
            <div className="inline-flex rounded-lg border border-rule bg-paper p-0.5">
              <button
                type="button"
                onClick={() => setLang('zh')}
                className={`rounded-md px-3 py-1 text-[12px] font-bold transition ${
                  lang === 'zh' ? 'bg-yellow text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                中文版
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`rounded-md px-3 py-1 text-[12px] font-bold transition ${
                  lang === 'en' ? 'bg-yellow text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 快捷操作 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-cream px-3 py-1 text-[12px] font-bold text-ink hover:border-ink hover:bg-fluff"
            >
              {copied ? '✓ 已复制 JSON' : '📋 复制 JSON 数据'}
            </button>
            <a
              href="/download"
              className="press inline-flex items-center gap-1 rounded-lg bg-yellow px-3 py-1 text-[12px] font-bold text-ink"
            >
              在 App 中使用 →
            </a>
          </div>
        </div>
      )}

      {/* A4 视窗容器：外层自适应缩放 */}
      <div className="relative w-full max-w-[794px] overflow-hidden rounded-xl border border-rule-strong bg-white shadow-xl">
        <div className="w-[794px] origin-top-left max-w-full">
          <TemplateComponent resume={resume} lang={lang} accent={accent} />
        </div>
      </div>
    </div>
  );
}
