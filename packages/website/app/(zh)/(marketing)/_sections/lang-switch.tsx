import type { Locale } from '../_i18n/locale';

// 语言切换。只在有对侧语言版本的双语页渲染（Header 收到 altHref 才显示）。
// 标签用目标语言的本名（endonym），与当前 locale 无关。
export function LangSwitch({ locale, altHref }: { locale: Locale; altHref: string }) {
  const isZh = locale === 'zh';
  return (
    <a
      href={altHref}
      hrefLang={isZh ? 'en' : 'zh-CN'}
      aria-label={isZh ? 'Switch to English' : '切换到中文'}
      className="ml-1 hidden rounded px-2 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-wider text-mute transition hover:bg-fluff hover:text-ink sm:inline-block"
    >
      {isZh ? 'EN' : '中文'}
    </a>
  );
}
