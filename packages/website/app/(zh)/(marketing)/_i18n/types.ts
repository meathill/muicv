import type { ReactNode } from 'react';

// 词典形状。全字段必填——zh/en 任一漏字段 tsc 直接报错，作为翻译完整性的护栏。
// 标题统一拆成 titleA + <Highlight>titleHighlight</Highlight> + titleEnd（句末标点在高亮外，保持原渲染）。

export type KeyFeature = {
  // 图标按稳定 id 映射，不按 title（英文 title 不同）。
  id: 'organize' | 'generate' | 'review' | 'practice';
  title: string;
  desc: string;
  status: 'live' | 'soon';
  highlights: string[];
};

export type WorkflowStep = { title: string; desc: string };

export type FaqItem = {
  q: string;
  /** 手风琴展示，可含 <a>/<ul>/<strong>。 */
  a: ReactNode;
  /** FAQPage JSON-LD acceptedAnswer.text 的纯文本镜像。 */
  text: string;
};

export type LabeledLink = { label: string; href: string };

export type Dictionary = {
  brand: { name: string; by: string };
  nav: {
    links: LabeledLink[];
    console: string;
    signIn: string;
    signUp: string;
  };
  footer: {
    tagline: string;
    curatedBy: string;
    cols: { label: string; links: LabeledLink[] }[];
    copyright: string;
    madeIn: string;
  };
  hero: {
    badge: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    lede: string;
    ctaDownload: string;
    ctaSteps: string;
    accountSignedIn: string;
    accountSignedOut: string;
    agentNote: string;
  };
  heroShowcase: {
    tabsAria: string;
    slides: { import: string; library: string; resume: string };
    caption: string;
    importHeader: string;
    importTitle: string;
    importDesc: string;
    importItems: { title: string; desc: string }[];
    libraryHeader: string;
    libraryNavLabel: string;
    libraryNav: string[];
    libraryListLabel: string;
    libraryItems: { title: string; match: string }[];
  };
  features: {
    eyebrow: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    lede: string;
    statusLive: string;
    statusSoon: string;
    items: KeyFeature[];
  };
  workflow: {
    eyebrow: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    aside: string;
    steps: WorkflowStep[];
  };
  desktopApp: {
    badge: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    lede: string;
    ctaDownload: string;
    ctaAdvanced: string;
    platforms: { name: string; sub: string }[];
    downloadLabel: string;
    noteBefore: string;
    noteLink: string;
    noteAfter: string;
  };
  install: {
    badge: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    lede: string;
    noteBefore: string;
    noteLink: string;
    noteAfter: string;
    cardMeta: string;
  };
  faq: {
    eyebrow: string;
    titleA: string;
    titleHighlight: string;
    titleEnd: string;
    articlesEyebrow: string;
    articlesTitle: string;
    articlesLede: string;
    articlesCta: string;
    articlesEmpty: string;
  };
  download: {
    eyebrow: string;
    title: string;
    lede: string;
    firstMinuteLabel: string;
    firstMinuteSteps: { title: string; desc: string }[];
    releasedAt: string;
    platforms: { title: string; subtitle: string; key: 'mac-arm64' | 'mac-x64' | 'win' | 'linux' }[];
    unsignedNote: string;
    noArch: string;
    downloadLabel: string;
    noReleaseLead: string;
    noReleaseSkill: string;
    noReleaseContactBefore: string;
    noReleaseContactLink: string;
    firstRunTitle: string;
    firstRunLede: string;
    firstRunMacSteps: ReactNode[];
    firstRunMacCliLabel: string;
    firstRunMacCli: string;
    firstRunWinSteps: ReactNode[];
    firstRunLinuxLede: string;
  };
  meta: {
    home: { title: string; description: string };
    download: { title: string; description: string };
  };
};
