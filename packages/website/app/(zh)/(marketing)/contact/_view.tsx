import { getDictionary, type Locale, localizedHref } from '../_i18n/dict';
import { ArrowUpRight, Highlight } from '../_icons';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

type ContactCard = { label: string; tag: string; email: string; desc: string };

type ContactContent = {
  meta: { title: string; description: string };
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleHighlight: string;
  heroTitleTail: string;
  heroLede: string;
  contacts: ContactCard[];
  noteStrong: string;
  noteLink: string;
  noteAfter: string;
};

const CONTACT_CONTENT: Record<Locale, ContactContent> = {
  zh: {
    meta: { title: '联系我们', description: '产品反馈、商务合作、媒体询问——找对邮箱，回复更快。' },
    heroEyebrow: '联系',
    heroTitleLead: '想跟我们 ',
    heroTitleHighlight: '说点什么',
    heroTitleTail: '？',
    heroLede: '我们读每一封邮件。一般会在 1–3 个工作日内回复；高峰期可能稍慢，但一定会回。',
    contacts: [
      {
        label: '一般联系',
        tag: '产品反馈 / 用户支持',
        email: 'hi@muicv.com',
        desc: '使用问题、bug 反馈、功能建议——任何关于产品本身的问题都可以发到这里。',
      },
      {
        label: '商务合作',
        tag: '企业 / 团队 / 合作',
        email: 'partner@muicv.com',
        desc: '团队批量采购、教育机构合作、求职平台对接——商务相关请走这个邮箱，回复更快。',
      },
      {
        label: '媒体询问',
        tag: '采访 / 报道 / 品牌',
        email: 'press@muicv.com',
        desc: '采访邀约、媒体素材、品牌资料申请。简单介绍下报道方向，我们会尽快回复。',
      },
    ],
    noteStrong: '想直接试用？',
    noteLink: '下载桌面 app',
    noteAfter: '立即开始，macOS / Windows / Linux 全平台可用。',
  },
  en: {
    meta: {
      title: 'Contact',
      description: 'Product feedback, partnerships, press — reach the right inbox for a faster reply.',
    },
    heroEyebrow: 'Contact',
    heroTitleLead: 'Want to ',
    heroTitleHighlight: 'tell us something',
    heroTitleTail: '?',
    heroLede:
      "We read every email. We usually reply within 1–3 business days; a bit slower at peak times, but you'll always hear back.",
    contacts: [
      {
        label: 'General',
        tag: 'Product feedback / support',
        email: 'hi@muicv.com',
        desc: 'Usage questions, bug reports, feature ideas — anything about the product itself goes here.',
      },
      {
        label: 'Partnerships',
        tag: 'Business / teams / partners',
        email: 'partner@muicv.com',
        desc: 'Team bulk plans, education partnerships, job-platform integrations — business goes here for a faster reply.',
      },
      {
        label: 'Press',
        tag: 'Interview / coverage / brand',
        email: 'press@muicv.com',
        desc: "Interview requests, media assets, brand materials. A quick note on your angle and we'll get back soon.",
      },
    ],
    noteStrong: 'Want to try it directly?',
    noteLink: 'Download the desktop app',
    noteAfter: 'to start now — available on macOS / Windows / Linux.',
  },
};

export function getContactMeta(locale: Locale) {
  return CONTACT_CONTENT[locale].meta;
}

export function ContactView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const c = CONTACT_CONTENT[locale];
  const altHref = locale === 'zh' ? '/en/contact' : '/contact';

  return (
    <div className="relative">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="max-w-3xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.heroEyebrow}</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              {c.heroTitleLead}
              <Highlight>{c.heroTitleHighlight}</Highlight>
              {c.heroTitleTail}
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-ink-soft">{c.heroLede}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-5 md:grid-cols-3">
            {c.contacts.map((card) => (
              <article
                key={card.email}
                className="flex flex-col rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)] transition-transform hover:-translate-y-1"
              >
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">{card.tag}</p>
                <h2 className="mt-2 text-[18px] font-extrabold text-ink">{card.label}</h2>
                <p className="mt-3 flex-1 text-[14px] leading-[1.7] text-ink-soft">{card.desc}</p>
                <a
                  href={`mailto:${card.email}`}
                  className="press mt-5 inline-flex items-center justify-between gap-2 rounded-xl bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink"
                >
                  <span className="truncate font-mono">{card.email}</span>
                  <ArrowUpRight />
                </a>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-xl border-2 border-rule bg-paper/50 p-6 text-[14px] leading-[1.7] text-ink-soft md:p-8">
            <p>
              <strong className="text-ink">{c.noteStrong}</strong>{' '}
              <a
                href={localizedHref(locale, '/download')}
                className="font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow"
              >
                {c.noteLink}
              </a>{' '}
              {c.noteAfter}
            </p>
          </div>
        </div>
      </section>

      <Footer dict={dict} locale={locale} />
    </div>
  );
}
