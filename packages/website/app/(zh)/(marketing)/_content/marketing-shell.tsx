import { getDictionary, type Locale } from '../_i18n/dict';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

/**
 * 通用营销页外壳。Header 保持纯 server component，配合上层页面的 revalidate 走 ISR。
 * Footer 里的语言切换器由 usePathname 自行推导目标 URL，不需要页面传 altHref。
 */
export function MarketingShell({
  children,
  locale = 'zh',
}: {
  children: React.ReactNode;
  locale?: Locale | undefined;
}) {
  const dict = getDictionary(locale);
  return (
    <div className="relative min-h-screen">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} />
      {children}
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
