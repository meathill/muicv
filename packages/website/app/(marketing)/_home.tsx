import { JsonLd } from '@/components/json-ld';
import { getWebsitePublishedPosts } from '@/lib/cms-content';

import { getDictionary, type Locale } from './_i18n/dict';
import { faqPageSchema } from './_schema';
import { DesktopApp } from './_sections/desktop-app';
import { FaqAndArticles } from './_sections/faq';
import { FAQ_ITEMS } from './_sections/faq-items';
import { KeyFeatures } from './_sections/features';
import { Footer } from './_sections/footer';
import { Header } from './_sections/header';
import { Hero } from './_sections/hero';
import { Install } from './_sections/install';
import { Workflow } from './_sections/workflow';

// 中英首页共用的渲染。两个 page.tsx 只负责各自的 metadata + revalidate。
export async function HomePage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const recentPosts = (await getWebsitePublishedPosts()).slice(0, 4);
  const altHref = locale === 'zh' ? '/en' : '/';

  return (
    <div className="relative">
      <JsonLd data={faqPageSchema(FAQ_ITEMS[locale], locale)} />
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />
      <Hero dict={dict} locale={locale} />
      <KeyFeatures dict={dict} />
      <Workflow dict={dict} />
      <DesktopApp dict={dict} locale={locale} />
      <Install dict={dict} locale={locale} />
      <FaqAndArticles recentPosts={recentPosts} dict={dict} locale={locale} />
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
