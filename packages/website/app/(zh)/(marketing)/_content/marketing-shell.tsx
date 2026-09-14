import { getDictionary, type Locale } from '../_i18n/dict';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

/**
 * 通用营销页外壳。Header 保持纯 server component，配合上层页面的 revalidate 走 ISR。
 * Footer 里的语言切换器由 usePathname 自行推导目标 URL；文章详情页额外透传
 * availableLocales，只显示真实有译文的语言，避免链到 404。
 */
export function MarketingShell({
  children,
  locale = 'zh',
  availableLocales,
}: {
  children: React.ReactNode;
  locale?: Locale | undefined;
  availableLocales?: readonly Locale[] | undefined;
}) {
  const dict = getDictionary(locale);
  return (
    <div className="relative min-h-screen">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} />
      {children}
      <Footer dict={dict} locale={locale} availableLocales={availableLocales} />
    </div>
  );
}
