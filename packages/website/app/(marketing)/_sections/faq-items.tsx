import { localizedHref } from '../_i18n/locale';
import type { Locale } from '../_i18n/locale';
import type { FaqItem } from '../_i18n/types';

// FAQ 手风琴问答内容按 locale 拆分，就近维护在这里，不放进 zh.tsx/en.tsx 词典。
// 原因：这里的 `a` 字段是 JSX（<ul>/<strong>/<a>），词典其余字段都是纯字符串——
// 把 ReactNode 混进本该是纯数据的 Dictionary 类型不是好的类型设计，拆出来更干净。
// （注：曾怀疑这会导致整份词典被打进客户端 bundle，用 git worktree 对比新旧构建的
// page_client-reference-manifest.js 验证后证伪——两版都不含词典内容，纯粹是类型卫生问题。）
const faqLink =
  'font-semibold text-yellow-deep underline decoration-corgi decoration-2 underline-offset-4 hover:decoration-yellow';

const FAQ_ITEMS_ZH: FaqItem[] = [
  {
    q: '我的简历数据存在哪？谁能看到？',
    a: (
      <>
        全部存在你自己的电脑上——以纯 Markdown 文件的形式，由你完全掌握。要不要备份、要不要分享给别人，都由你决定。
        我们的服务器只在你主动调用导出 PDF / 抓取岗位等功能时短暂经手数据，处理完即丢弃，不留存任何简历内容。
      </>
    ),
    text: '全部存在你自己的电脑上——以纯 Markdown 文件的形式，由你完全掌握。要不要备份、要不要分享给别人都由你决定。我们的服务器只在你主动调用导出 PDF / 抓取岗位等功能时短暂经手数据，处理完即丢弃，不留存任何简历内容。',
  },
  {
    q: '怎么收费？',
    a: (
      <>
        统一 token 钱包：
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>注册一次性赠送 10,000 tokens</strong>，永不过期，用完为止
          </li>
          <li>
            <strong>订阅</strong>：Pro / Max 月付或年付，按周期自动续 token；年付一次发整年用量，约 17% 折扣
          </li>
          <li>
            <strong>补充包</strong>：一次性买 10K / 35K / 130K tokens，随用随买
          </li>
          <li>
            <strong>BYOK</strong>：在控制台绑你自己的 API 地址和 key，LLM 走你余额；PDF / JD 仍按 muicv tokens 扣
          </li>
        </ul>
        云端服务（导出 PDF、寻找岗位等）按 token 扣费。具体价格请看{' '}
        <a href="/pricing" className={faqLink}>
          定价页
        </a>
        。
      </>
    ),
    text: '统一 token 钱包：注册一次性赠送 10,000 tokens，永不过期；订阅 Pro / Max 月付或年付，按周期自动续 token，年付约 17% 折扣；补充包一次性买 10K / 35K / 130K tokens；BYOK 可绑自己的 API key 让 LLM 走你余额。云端服务（导出 PDF、寻找岗位等）按 token 扣费，具体看定价页。',
  },
  {
    q: '什么是 BYOK？',
    a: (
      <>
        BYOK = Bring Your Own Key，自带 LLM 余额。绑定之后，所有 AI 调用走你自己的余额， 我们不再消耗平台
        token——适合已经有 LLM 服务订阅、希望统一成本管理的用户。
      </>
    ),
    text: 'BYOK = Bring Your Own Key，自带 LLM 余额。绑定之后所有 AI 调用走你自己的余额，我们不再消耗平台 token——适合已经有 LLM 服务订阅、希望统一成本管理的用户。',
  },
  {
    q: '桌面 app 什么时候发布？',
    a: (
      <>
        <strong>已经上线</strong>，macOS / Windows / Linux 全平台可用。 去{' '}
        <a href="/download" className={faqLink}>
          下载页
        </a>{' '}
        获取最新版本。 已经在用 AI agent（Claude Code / Codex / Cursor 等）的用户也可以通过 skill
        套件直接接入，二选一即可。
      </>
    ),
    text: '已经上线，macOS / Windows / Linux 全平台可用，去下载页获取最新版本。已经在用 AI agent（Claude Code / Codex / Cursor 等）的用户也可以通过 skill 套件直接接入，二选一即可。',
  },
  {
    q: '支持英文 / 双语简历吗？',
    a: <>支持。素材是中文，简历就是中文；目标岗位是英文，生成的简历会按英文风格写； 中英对照模板已在规划中。</>,
    text: '支持。素材是中文，简历就是中文；目标岗位是英文，生成的简历会按英文风格写；中英对照模板已在规划中。',
  },
  {
    q: '会自动投递到 LinkedIn / Boss 直聘吗？',
    a: (
      <>
        不会。我们只帮你抓岗位、生成针对性简历、写求职信、整理 checklist——
        真正的“按提交按钮”由你手动完成。这是有意为之，避免账号风险和 ToS 违规。
      </>
    ),
    text: '不会。我们只帮你抓岗位、生成针对性简历、写求职信、整理 checklist——真正的“按提交按钮”由你手动完成。这是有意为之，避免账号风险和 ToS 违规。',
  },
  {
    q: 'MuiCV 适合谁用？',
    a: (
      <>
        正在找工作、需要反复改简历的人——校招生、社招跳槽、转行，或者同时投很多岗位的人。已经在用 Claude Code、Cursor 等
        AI agent 的可以直接接 skill；不想折腾命令行就下载桌面 app。你负责经历，Mui 负责把它整理成对得上岗位的简历。
      </>
    ),
    text: '正在找工作、需要反复改简历的人——校招生、社招跳槽、转行，或者同时投很多岗位的人。已经在用 Claude Code、Cursor 等 AI agent 的可以直接接 skill；不想折腾命令行就下载桌面 app。你负责经历，Mui 负责把它整理成对得上岗位的简历。',
  },
  {
    q: 'AI 会帮我优化 / 修改简历吗？',
    a: (
      <>
        会，但只基于你提供的事实。Mui 按 STAR、量化结果、岗位关键词、篇幅等维度评审草稿，指出哪句太虚、哪段缺数据、
        哪些关键词没覆盖，并给出可直接采用的改写建议。贴上目标岗位描述，它还会针对该岗位重新挑选和改写素材。绝不替你编造经历。
      </>
    ),
    text: '会，但只基于你提供的事实。Mui 按 STAR、量化结果、岗位关键词、篇幅等维度评审草稿，指出哪句太虚、哪段缺数据、哪些关键词没覆盖，并给出可直接采用的改写建议。贴上目标岗位描述，它还会针对该岗位重新挑选和改写素材。绝不替你编造经历。',
  },
  {
    q: 'MuiCV 官网是哪个？',
    a: (
      <>
        官网只有一个：<strong>muicv.com</strong>，www.muicv.com 会自动跳转过来。产品中文名叫 Mui简历，英文名
        MuiCV。网上有一些名字相近的简历工具，和我们没有关联；收藏或搜索时认准 muicv.com 就不会走错。
      </>
    ),
    text: '官网只有一个：muicv.com，www.muicv.com 会自动跳转过来。产品中文名叫 Mui简历，英文名 MuiCV。网上有一些名字相近的简历工具，和我们没有关联；收藏或搜索时认准 muicv.com 就不会走错。',
  },
];

const FAQ_ITEMS_EN: FaqItem[] = [
  {
    q: 'Where is my resume data stored? Who can see it?',
    a: (
      <>
        It all lives on your own computer — as plain Markdown files, fully under your control. Whether to back it up or
        share it is up to you. Our servers only touch data briefly when you actively call features like PDF export or
        job scraping, then discard it — we keep none of your resume content.
      </>
    ),
    text: 'It all lives on your own computer as plain Markdown files, fully under your control. Whether to back it up or share it is up to you. Our servers only touch data briefly when you actively call features like PDF export or job scraping, then discard it — we keep none of your resume content.',
  },
  {
    q: 'How much does it cost?',
    a: (
      <>
        A single token wallet:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Sign up and get 10,000 tokens once</strong>, no expiry, until used up
          </li>
          <li>
            <strong>Subscription</strong>: Pro / Max monthly or yearly, auto-refilled each period; yearly grants the
            full year at once, about 17% off
          </li>
          <li>
            <strong>Top-up packs</strong>: buy 10K / 35K / 130K tokens one-off, anytime
          </li>
          <li>
            <strong>BYOK</strong>: bind your own API endpoint and key in the console so the LLM runs on your balance;
            PDF / JD still bill muicv tokens
          </li>
        </ul>
        Cloud features (PDF export, job search, etc.) bill by token. See the{' '}
        <a href={localizedHref('en', '/pricing')} className={faqLink}>
          pricing page
        </a>{' '}
        for details.
      </>
    ),
    text: 'A single token wallet: sign up and get 10,000 tokens once, no expiry; Pro / Max subscriptions bill monthly or yearly and auto-refill each period (yearly about 17% off); top-up packs buy 10K / 35K / 130K tokens one-off; BYOK lets you bind your own API key so the LLM runs on your balance. Cloud features (PDF export, job search, etc.) bill by token. See the pricing page for details.',
  },
  {
    q: 'What is BYOK?',
    a: (
      <>
        BYOK = Bring Your Own Key — use your own LLM balance. Once bound, all AI calls run on your own balance and we
        stop spending platform tokens — ideal if you already subscribe to an LLM service and want unified cost control.
      </>
    ),
    text: 'BYOK = Bring Your Own Key — use your own LLM balance. Once bound, all AI calls run on your own balance and we stop spending platform tokens — ideal if you already subscribe to an LLM service and want unified cost control.',
  },
  {
    q: 'When does the desktop app ship?',
    a: (
      <>
        <strong>It's already live</strong>, on macOS / Windows / Linux. Head to the{' '}
        <a href={localizedHref('en', '/download')} className={faqLink}>
          download page
        </a>{' '}
        for the latest build. If you already use an AI agent (Claude Code / Codex / Cursor, etc.), you can plug in via
        the skill kit instead — either path works.
      </>
    ),
    text: "It's already live, on macOS / Windows / Linux — head to the download page for the latest build. If you already use an AI agent (Claude Code / Codex / Cursor, etc.), you can plug in via the skill kit instead. Either path works.",
  },
  {
    q: 'Does it support English / bilingual resumes?',
    a: (
      <>
        Yes. Write your material in any language; the generated resume follows the target job — an English role gets an
        English-style resume. Side-by-side bilingual templates are on the roadmap.
      </>
    ),
    text: 'Yes. Write your material in any language; the generated resume follows the target job — an English role gets an English-style resume. Side-by-side bilingual templates are on the roadmap.',
  },
  {
    q: 'Will it auto-apply to LinkedIn / job boards?',
    a: (
      <>
        No. We only help you scrape jobs, generate targeted resumes, write cover letters, and organize a checklist — you
        press “submit” yourself. That's intentional, to avoid account risk and ToS violations.
      </>
    ),
    text: "No. We only help you scrape jobs, generate targeted resumes, write cover letters, and organize a checklist — you press “submit” yourself. That's intentional, to avoid account risk and ToS violations.",
  },
  {
    q: 'Who is MuiCV for?',
    a: (
      <>
        People job-hunting who revise resumes a lot — new grads, people switching jobs, career changers, or anyone
        applying to many roles at once. Already on an AI agent like Claude Code or Cursor? Plug in the skill. Don't want
        the command line? Download the desktop app. You bring the experience; Mui shapes it into a resume that fits the
        role.
      </>
    ),
    text: "People job-hunting who revise resumes a lot — new grads, people switching jobs, career changers, or anyone applying to many roles at once. Already on an AI agent like Claude Code or Cursor? Plug in the skill. Don't want the command line? Download the desktop app. You bring the experience; Mui shapes it into a resume that fits the role.",
  },
  {
    q: 'Does MuiCV optimize my resume with AI?',
    a: (
      <>
        Yes — but only from the facts you provide. Mui reviews drafts against STAR, quantified results, job keywords,
        and length; flags lines that are vague, sections missing data, and keywords you haven't covered; and suggests
        rewrites you can use directly. Paste a target job description and it re-selects and rewrites material for that
        role. It never fabricates experience.
      </>
    ),
    text: "Yes — but only from the facts you provide. Mui reviews drafts against STAR, quantified results, job keywords, and length; flags vague lines, sections missing data, and keywords you haven't covered; and suggests rewrites you can use directly. Paste a target job description and it re-selects and rewrites material for that role. It never fabricates experience.",
  },
  {
    q: 'What is the official MuiCV website?',
    a: (
      <>
        Just one: <strong>muicv.com</strong> — www.muicv.com redirects here. Some resume tools have similar names but
        aren't related to us; bookmark muicv.com and you'll always land in the right place.
      </>
    ),
    text: "Just one: muicv.com — www.muicv.com redirects here. Some resume tools have similar names but aren't related to us; bookmark muicv.com and you'll always land in the right place.",
  },
];

export const FAQ_ITEMS: Record<Locale, FaqItem[]> = {
  zh: FAQ_ITEMS_ZH,
  en: FAQ_ITEMS_EN,
};
