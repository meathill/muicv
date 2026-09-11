'use client';

import { usePathname } from 'next/navigation';

import { LOCALES, type Locale, localizedHref } from '../_i18n/locale';

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

/** 各语言的本名（endonym），与当前 locale 无关。 */
const LOCALE_LABELS: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  th: 'ไทย',
  vi: 'Tiếng Việt',
};

/** hreflang 属性值：默认语言用 zh-CN，其余与 URL 段同名。 */
function hreflangKey(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : locale;
}

/** 去掉当前路径的 locale 前缀，还原成默认语言（zh）形态，供 localizedHref 重新映射。 */
function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (locale === 'zh') continue;
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/**
 * 语言选择器。用原生 `<details>` 做下拉（不需要 JS 状态），
 * 每项指向当前页面在对应语言下的 URL（由 usePathname + localizedHref 推导，
 * 未本地化的路径会自动回退，不会造 404）。
 */
export function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? '/';
  const basePath = stripLocalePrefix(pathname);

  return (
    <details className="group relative inline-block">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded border border-rule px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-mute transition hover:border-ink hover:bg-fluff hover:text-ink">
        <GlobeIcon className="h-3.5 w-3.5 text-mute" />
        <span>{LOCALE_LABELS[locale]}</span>
        <span aria-hidden className="text-[9px] transition group-open:rotate-180">
          ▼
        </span>
      </summary>
      <ul className="absolute bottom-full left-0 z-40 mb-1 min-w-[140px] rounded-md border-2 border-rule bg-cream p-1 shadow-lg">
        {LOCALES.map((target) => (
          <li key={target}>
            <a
              href={localizedHref(target, basePath)}
              hrefLang={hreflangKey(target)}
              aria-current={target === locale ? 'true' : undefined}
              className={
                target === locale
                  ? 'block rounded px-2.5 py-1.5 text-[12px] font-bold text-ink'
                  : 'block rounded px-2.5 py-1.5 text-[12px] text-ink-soft hover:bg-fluff hover:text-ink'
              }
            >
              {LOCALE_LABELS[target]}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
