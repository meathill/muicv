import type { Locale } from '../_i18n/locale';

export function GlobeIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// 语言切换。只在有对侧语言版本的双语页渲染（Footer 收到 altHref 才显示）。
// 标签用目标语言的本名（endonym），与当前 locale 无关。
export function LangSwitch({ locale, altHref }: { locale: Locale; altHref: string }) {
  const isZh = locale === 'zh';
  return (
    <a
      href={altHref}
      hrefLang={isZh ? 'en' : 'zh-CN'}
      aria-label={isZh ? 'Switch to English' : '切换到中文'}
      className="inline-flex items-center gap-1.5 rounded border border-rule px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-mute transition hover:border-ink hover:bg-fluff hover:text-ink"
    >
      <GlobeIcon className="h-3.5 w-3.5 text-mute" />
      <span>{isZh ? 'English' : '中文'}</span>
    </a>
  );
}
