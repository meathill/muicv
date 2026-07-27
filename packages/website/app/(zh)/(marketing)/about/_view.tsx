import type { ReactNode } from 'react';

import { CorgiMascot } from '@/components/corgi-mascot';

import { getDictionary, type Locale, localizedHref } from '../_i18n/dict';
import { ArrowUpRight, Highlight, PawIcon } from '../_icons';
import { AccountLink } from '../_sections/account-link';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';

type AboutContent = {
  meta: { title: string; description: string };
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleHighlight: string;
  heroTitleMid: string;
  heroTitleTail: string;
  heroLede: string;
  doEyebrow: string;
  doTitle: string;
  doCards: { t: string; d: string }[];
  whyEyebrow: string;
  whyTitle: string;
  whyParagraphs: string[];
  teamEyebrow: string;
  teamTitle: string;
  teamPara1: ReactNode;
  teamPara2: string;
  ctaTitle: string;
  ctaSignedIn: string;
  ctaSignedOut: string;
  ctaContact: string;
};

const ABOUT_CONTENT: Record<Locale, AboutContent> = {
  zh: {
    meta: { title: '关于我们', description: '我们想做一个真正帮你拿到 offer 的工具，而不是又一个简历模板生成器。' },
    heroEyebrow: '关于',
    heroTitleLead: '一个真正帮你拿到 ',
    heroTitleHighlight: 'offer',
    heroTitleMid: ' 的工具，',
    heroTitleTail: '不是又一个模板生成器。',
    heroLede:
      'Mui简历是一个一站式 AI 求职平台：从整理过往经历开始，到发现合适的岗位、定制简历、模拟面试、写求职信，全程围绕“拿到下一份工作”这件事——而不只是产出一个好看的 PDF。',
    doEyebrow: '我们做什么',
    doTitle: '从素材到 offer 的完整链路。',
    doCards: [
      {
        t: '不只是简历',
        d: '简历只是入口。我们看重的是后面真正决定你拿不拿到 offer 的环节：岗位匹配、面试准备、就业策略。',
      },
      { t: '数据自主', d: '所有素材以 Markdown 文件存在你自己电脑或项目里。我们不做云端“简历库”，不锁住你的数据。' },
      {
        t: '不替你发挥',
        d: '所有内容严格基于你写下的事实。缺素材就追问或留空，绝不替你“创作”——避免面试时被自己的简历坑到。',
      },
    ],
    whyEyebrow: '为什么做',
    whyTitle: '找工作这件事，不该这么难。',
    whyParagraphs: [
      '我们见过太多优秀的候选人栽在简历上：内容很厉害但讲不清楚、模板套了一个又一个、对着 JD 改了一晚上还是不知道该不该投。',
      '市面上的简历工具大多只解决了“排版好看”，但找工作的真正难点在前后两端：前端是“自己有什么能讲的”，后端是“哪个岗位适合我、面试要准备什么”。',
      '我们想做的是一整条链路上的工具，把每个环节都做到不糊弄：从你写下第一段经历开始，一直到拿到 offer 的那天。',
    ],
    teamEyebrow: '团队',
    teamTitle: '一只柯基带一个工程师。',
    teamPara1: (
      <>
        项目由 <strong className="text-ink">meathill</strong>（一名做了多年前端的开发者）发起， 由柯基{' '}
        <strong className="text-ink">Mui</strong> 监修——她是 meathill
        家的黄白色小狗，监修产品时会趴在键盘上影响代码合入。
      </>
    ),
    teamPara2: '未来会有更多伙伴加入，但产品的初心不会变：做工具，不做营销噱头；把用户体验和数据自主放在最前面。',
    ctaTitle: '找到下一份工作，从这里开始。',
    ctaSignedIn: '进入控制台',
    ctaSignedOut: '免费开始',
    ctaContact: '联系我们',
  },
  en: {
    meta: {
      title: 'About',
      description:
        'We want to build a tool that actually helps you land an offer — not another resume template generator.',
    },
    heroEyebrow: 'About',
    heroTitleLead: 'A tool that actually lands you the ',
    heroTitleHighlight: 'offer',
    heroTitleMid: ',',
    heroTitleTail: 'not just another template generator.',
    heroLede:
      'MuiCV is an all-in-one AI job-search platform: from organizing your past experience to finding the right roles, tailoring resumes, mock interviews, and cover letters — all focused on landing your next job, not just producing a pretty PDF.',
    doEyebrow: 'What we do',
    doTitle: 'The full path from material to offer.',
    doCards: [
      {
        t: 'Not just resumes',
        d: 'A resume is only the entry point. We care about what actually decides the offer: job matching, interview prep, and search strategy.',
      },
      {
        t: 'Your data, yours',
        d: 'All material lives as Markdown files on your own computer or project. No cloud "resume vault", no locking up your data.',
      },
      {
        t: "We don't make things up",
        d: 'Everything is strictly based on facts you write down. Missing material? We ask or leave it blank — never "create" for you, so your resume never trips you up in the interview.',
      },
    ],
    whyEyebrow: 'Why we built it',
    whyTitle: "Job hunting shouldn't be this hard.",
    whyParagraphs: [
      "We've seen too many strong candidates sunk by their resume: great work but unclear writing, one template after another, a whole night tweaking against a JD and still unsure whether to apply.",
      'Most resume tools only solve “looks tidy”, but the real difficulty is at both ends: up front, “what do I actually have to tell”, and after, “which role fits me and what to prep for the interview”.',
      'We want a tool across the whole path, doing each step without cutting corners — from the first experience you write down to the day you get the offer.',
    ],
    teamEyebrow: 'Team',
    teamTitle: 'One corgi, one engineer.',
    teamPara1: (
      <>
        Started by <strong className="text-ink">meathill</strong> (a developer with years of frontend work), curated by
        the corgi <strong className="text-ink">Mui</strong> — meathill's yellow-and-white dog, who curates by lying on
        the keyboard and influencing merges.
      </>
    ),
    teamPara2:
      "More teammates will join, but the original intent won't change: build tools, not marketing gimmicks; put user experience and data ownership first.",
    ctaTitle: 'Find your next job, starting here.',
    ctaSignedIn: 'Go to dashboard',
    ctaSignedOut: 'Start free',
    ctaContact: 'Contact us',
  },
};

export function getAboutMeta(locale: Locale) {
  return ABOUT_CONTENT[locale].meta;
}

export function AboutView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const c = ABOUT_CONTENT[locale];
  const altHref = locale === 'zh' ? '/en/about' : '/about';

  return (
    <div className="relative">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="pointer-events-none absolute right-[8%] top-[20%] hidden text-corgi/40 lg:block">
          <PawIcon className="h-9 w-9" />
        </div>

        <div className="relative mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-24">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.heroEyebrow}</p>
          <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
            {c.heroTitleLead}
            <Highlight>{c.heroTitleHighlight}</Highlight>
            {c.heroTitleMid}
            <br />
            {c.heroTitleTail}
          </h1>
          <p className="mt-6 max-w-2xl text-[18px] leading-[1.7] text-ink-soft">{c.heroLede}</p>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.doEyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.doTitle}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {c.doCards.map((item) => (
              <div
                key={item.t}
                className="rounded-xl border-2 border-ink bg-cream p-6 transition-transform hover:-translate-y-1"
              >
                <p className="text-[16px] font-extrabold text-ink">{item.t}</p>
                <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.whyEyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.whyTitle}
          </h2>
          <div className="mt-8 space-y-5 text-[16px] leading-[1.8] text-ink-soft">
            {c.whyParagraphs.map((p) => (
              <p key={p.slice(0, 16)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.teamEyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.teamTitle}
          </h2>
          <div className="mt-8 grid items-start gap-8 md:grid-cols-[auto_1fr]">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-yellow/20 blur-xl" aria-hidden />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-ink bg-cream shadow-[0_4px_0_0_var(--color-yellow-shadow)]">
                <CorgiMascot className="h-20 w-20" />
              </div>
            </div>
            <div className="text-[16px] leading-[1.8] text-ink-soft">
              <p>{c.teamPara1}</p>
              <p className="mt-3">{c.teamPara2}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center md:px-8 md:py-20">
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.ctaTitle}
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <AccountLink
              className="press inline-flex items-center gap-2 rounded-xl bg-yellow px-5 py-3 text-[16px] font-bold text-ink"
              signedInLabel={c.ctaSignedIn}
              signedOutLabel={c.ctaSignedOut}
            >
              <ArrowUpRight />
            </AccountLink>
            <a
              href={localizedHref(locale, '/contact')}
              className="press-ink inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-cream px-5 py-3 text-[16px] font-bold text-ink"
            >
              {c.ctaContact}
              <ArrowUpRight />
            </a>
          </div>
        </div>
      </section>

      <Footer dict={dict} locale={locale} />
    </div>
  );
}
