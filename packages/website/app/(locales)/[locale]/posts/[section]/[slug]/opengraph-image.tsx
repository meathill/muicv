import { CONTENT_LOCALES, type ContentLocale, type PostSection } from '@muicv/shared';
import { OG_SIZE, renderPostOgImage } from '@/app/(zh)/(marketing)/_content/post-og';

import { BLOG_STRINGS } from '@/app/(zh)/(marketing)/_i18n/blog';
import { getWebsitePostBySlug } from '@/lib/cms-content';

export const alt = 'MuiCV article';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

type Params = { locale: string; section: string; slug: string };

function isLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { locale, section, slug } = await params;
  if (!isLocale(locale) || !isPostSection(section)) {
    return renderPostOgImage({
      post: { title: 'MuiCV', author: 'MuiCV', publishedAt: new Date().toISOString() },
      sectionLabel: 'MuiCV',
      brandName: 'MuiCV',
      shareLabel: 'MuiCV',
      fontFamily: 'Noto+Sans',
    });
  }

  const post = await getWebsitePostBySlug(locale, section, slug);
  const strings = BLOG_STRINGS[locale];
  if (!post) {
    return renderPostOgImage({
      post: { title: 'MuiCV', author: 'MuiCV', publishedAt: new Date().toISOString() },
      sectionLabel: strings.sections[section],
      brandName: strings.brand,
      shareLabel: strings.eyebrow,
      fontFamily: 'Noto+Sans',
    });
  }

  return renderPostOgImage({
    post,
    sectionLabel: strings.sections[post.section],
    brandName: strings.brand,
    shareLabel: strings.eyebrow,
    fontFamily: 'Noto+Sans',
  });
}
