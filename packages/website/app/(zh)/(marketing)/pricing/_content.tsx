import type { Locale } from '../_i18n/locale';

// 定价页文案（中英）。价格 / token 数 / 货币等数据来自 @muicv/shared，不在这里；这里只放 UI 文案。
export type PricingContent = {
  meta: { title: string; description: string };
  heroEyebrow: string;
  heroTitleLead: string;
  heroTitleHighlight: string;
  heroTitleMid: string;
  heroTitleTail: string;
  heroLede: string;
  toggleMonthly: string;
  toggleYearly: string;
  toggleSavings: string;
  free: {
    title: string;
    sub: string;
    grantNote: string;
    bullets: string[];
    ctaSignedIn: string;
    ctaSignedOut: string;
  };
  // 订阅卡首行 token：`${tokenLine[interval]} ${count} tokens`
  tokenLineYearly: string;
  tokenLineMonthly: string;
  tiers: {
    pro: { tagline: string; badge: string; features: string[] };
    max: { tagline: string; features: string[] };
  };
  cardPerYear: string;
  cardPerMonth: string;
  signUpToSubscribe: string;
  manageSub: string;
  subscribeNow: string;
  cnBuyPrefix: string;
  cnPackNote: (days: number) => string;
  topupHeading: string;
  topupDesc: string;
  buyNow: string;
  signUpToBuy: string;
  faqEyebrow: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
};

const zh: PricingContent = {
  meta: {
    title: '定价',
    description: '按 token 计费，永不过期。注册即送 10K tokens；月付 / 年付 / 一次性补充包随你选。',
  },
  heroEyebrow: '定价',
  heroTitleLead: '按 ',
  heroTitleHighlight: 'token',
  heroTitleMid: ' 计费，',
  heroTitleTail: '永不过期。',
  heroLede:
    '注册即送 10,000 tokens（一次性）。不够用了选月付 / 年付订阅，或随时买补充包。Skill 始终免费，BYOK 始终可用。',
  toggleMonthly: '月付',
  toggleYearly: '年付',
  toggleSavings: '省 ≈17%',
  free: {
    title: '免费起步',
    sub: '想试一下，先从这开始。',
    grantNote: '注册赠送 · 仅一次',
    bullets: [
      '所有云端服务（LLM / PDF / JD）都能用',
      '本地素材管理无限',
      '接入 BYOK 即可“无限”用 LLM',
      '用完后买补充包或订阅，余额永不过期',
    ],
    ctaSignedIn: '进入控制台',
    ctaSignedOut: '免费注册领 10K tokens',
  },
  tokenLineYearly: '一次性发整年',
  tokenLineMonthly: '每月自动续',
  tiers: {
    pro: {
      tagline: '认真求职阶段。',
      badge: '最受欢迎',
      features: [
        '所有功能（LLM / PDF / JD / 招聘库）按 token 自由分配',
        '取消订阅，已发 token 永不过期',
        '优先邮件支持',
      ],
    },
    max: { tagline: '密集求职专用。', features: ['所有 Pro 功能', '抢先体验新模块', '专属支持渠道'] },
  },
  cardPerYear: '每年',
  cardPerMonth: '每月',
  signUpToSubscribe: '注册后开通',
  manageSub: '管理订阅',
  subscribeNow: '立即订阅',
  cnBuyPrefix: '购买 ',
  cnPackNote: (days) => `国内一次性付费 · 同周期 ${days} 天内每位用户限购一次 · token 永不过期`,
  topupHeading: '补充包（一次性买，永不过期）',
  topupDesc: '没准备订阅，或者偶尔超用一次。任何时候都能买。',
  buyNow: '立即购买',
  signUpToBuy: '注册后购买',
  faqEyebrow: '关于定价',
  faqTitle: '一些会被问到的细节。',
  faq: [
    {
      q: 'MuiCV 是如何计费的？',
      a: 'LLM 调用直接按上游 prompt + completion token 记录，并按定价换算，包括缓存部分，也按上游标价计费；PDF 渲染每次扣 200 tokens；JD 抓取每次扣 300 tokens。所有调用都会在控制台流水里看到明细。',
    },
    {
      q: '月付和年付有什么区别？',
      a: '价格上年付有约 17% 折扣；token 上年付一次性给你整年用量，付款当天就能集中用。取消订阅后已发的 token 全部保留，永不过期。月付适合先试一试，年付适合确定要长期用。',
    },
    {
      q: '订阅和补充包能同时用吗？',
      a: '可以。订阅是“按周期自动续”，补充包是“用完手动加”。两边到账的 tokens 都进同一个余额，不分先后用。',
    },
    {
      q: '可以随时升降档 / 取消吗？',
      a: '可以。在控制台点“管理订阅”会跳到 Stripe Customer Portal，取消、切档、换支付方式都在那里。已发的 tokens 永不过期，取消之后接着用旧余额。费用按实际使用量结算，不会重复计费。',
    },
    {
      q: 'Free 用户每月会自动续 token 吗？',
      a: '不会。注册时一次性赠送 10,000 tokens，仅此一次。用完为止；之后要继续用，可以买补充包（最便宜 ¥10 = 10K tokens）、订阅月付 / 年付，或绑 BYOK 让 LLM 走自己的 API（PDF / JD 仍按 muicv tokens 扣）。',
    },
    {
      q: '不满意能退款吗？',
      a: '订阅 7 天内未消耗主要功能可全额退款，邮件联系。补充包付款立刻入账，原则上不退；如果是误购或重大问题，依然可邮件协商。',
    },
    {
      q: '我买了别家 API，还要付费吗？',
      a: '可以选只用 BYOK：把你的 API 地址和 API key 绑到控制台，这样所有 LLM 调用都会走你自己的 API 余额，不消耗 muicv tokens。但 PDF 渲染 / JD 抓取等增值服务仍会按 muicv tokens 扣（这些服务只能由我们提供）。',
    },
    {
      q: '我不知道去哪里买 API，你有推荐吗？',
      a: '我还开发了 muirouter，全部使用原厂 AI，支持全部主流产品。如果你不止在一个地方使用 AI 产品，希望更好的使用你的 AI 预算，推荐你试一下：https://muirouter.com。',
    },
    {
      q: '自带 API（BYOK）有什么好处？',
      a: '比如我们的套餐你都不喜欢，觉得要么不够要么太多，或者你要使用不止一个 AI 产品，就可以考虑自带 API（BYOK）。这样你在这个平台用不完的额度，还可以用于其他的 AI 产品。',
    },
    {
      q: 'Skill 套件本身收费吗？',
      a: '不收费。npx skills add 装到 Claude Code / Codex / Cursor 等任意 AI agent 完全免费——平台计费只针对服务端能力（导出PDF / 寻找岗位）。',
    },
  ],
};

const en: PricingContent = {
  meta: {
    title: 'Pricing',
    description:
      'Pay by token, never expires. Sign up for 10K free tokens; choose monthly, yearly, or one-time top-up packs.',
  },
  heroEyebrow: 'Pricing',
  heroTitleLead: 'Pay by ',
  heroTitleHighlight: 'token',
  heroTitleMid: ',',
  heroTitleTail: 'never expires.',
  heroLede:
    'Sign up for 10,000 free tokens (one time). When you need more, subscribe monthly or yearly, or buy a top-up pack anytime. Skills are always free, BYOK always available.',
  toggleMonthly: 'Monthly',
  toggleYearly: 'Yearly',
  toggleSavings: 'save ≈17%',
  free: {
    title: 'Free to start',
    sub: 'Want to try it? Start here.',
    grantNote: 'On sign-up · one time',
    bullets: [
      'All cloud services (LLM / PDF / JD)',
      'Unlimited local material management',
      'Plug in BYOK for "unlimited" LLM',
      'Top up or subscribe when it runs out — balance never expires',
    ],
    ctaSignedIn: 'Go to dashboard',
    ctaSignedOut: 'Sign up for 10K free tokens',
  },
  tokenLineYearly: 'Full year upfront:',
  tokenLineMonthly: 'Monthly auto-refill:',
  tiers: {
    pro: {
      tagline: 'For a serious job search.',
      badge: 'Most popular',
      features: [
        'All features (LLM / PDF / JD / job library) freely allocated by token',
        'Cancel anytime — granted tokens never expire',
        'Priority email support',
      ],
    },
    max: {
      tagline: 'For an intense search.',
      features: ['Everything in Pro', 'Early access to new modules', 'Dedicated support channel'],
    },
  },
  cardPerYear: 'Yearly',
  cardPerMonth: 'Monthly',
  signUpToSubscribe: 'Sign up to subscribe',
  manageSub: 'Manage subscription',
  subscribeNow: 'Subscribe',
  cnBuyPrefix: 'Buy ',
  cnPackNote: (days) => `One-time payment (China) · one purchase per user per ${days}-day cycle · tokens never expire`,
  topupHeading: 'Top-up packs (one-time, never expire)',
  topupDesc: 'Not ready to subscribe, or an occasional overage. Buy anytime.',
  buyNow: 'Buy now',
  signUpToBuy: 'Sign up to buy',
  faqEyebrow: 'About pricing',
  faqTitle: 'A few details people ask about.',
  faq: [
    {
      q: 'How does MuiCV bill?',
      a: 'LLM calls are recorded by upstream prompt + completion tokens and converted at our pricing (cached portions are billed at upstream rates too); PDF rendering costs 200 tokens each; JD scraping costs 300 tokens each. Every call shows up in your console ledger.',
    },
    {
      q: "What's the difference between monthly and yearly?",
      a: 'Yearly is about 17% cheaper, and grants the full year of tokens at once — usable from day one. Cancel and all granted tokens stay, never expiring. Monthly is good to try; yearly is for committing long-term.',
    },
    {
      q: 'Can I use a subscription and top-up packs together?',
      a: 'Yes. A subscription auto-refills each period; top-up packs are added manually when you run low. Tokens from both go into the same balance, used in no particular order.',
    },
    {
      q: 'Can I upgrade / downgrade / cancel anytime?',
      a: 'Yes. "Manage subscription" in the console opens the Stripe Customer Portal — cancel, switch tiers, or change payment method there. Granted tokens never expire; after canceling you keep using your old balance. Billing is settled by actual usage, never double-charged.',
    },
    {
      q: 'Do free users get tokens refilled monthly?',
      a: "No. Sign-up grants 10,000 tokens once, that's it. When it runs out, buy a top-up pack (cheapest ¥10 = 10K tokens), subscribe monthly / yearly, or use BYOK so the LLM runs on your own API (PDF / JD still bill muicv tokens).",
    },
    {
      q: "Refunds if I'm not satisfied?",
      a: "Subscriptions are fully refundable within 7 days if the main features are unused — email us. Top-up packs credit instantly and generally aren't refundable; for accidental purchases or major issues, email us and we'll work it out.",
    },
    {
      q: 'I bought API elsewhere — do I still pay?',
      a: 'You can use BYOK only: bind your API endpoint and key in the console, and all LLM calls run on your own API balance, spending no muicv tokens. But value-added services like PDF rendering / JD scraping still bill muicv tokens (only we can provide those).',
    },
    {
      q: "I don't know where to buy API — any recommendation?",
      a: 'I also built muirouter — all first-party AI, supporting every major product. If you use AI in more than one place and want to make better use of your AI budget, give it a try: https://muirouter.com.',
    },
    {
      q: "What's the benefit of BYOK?",
      a: "If none of our plans fit — too little or too much — or you use more than one AI product, consider BYOK. Then whatever quota you don't use up here can go toward your other AI products.",
    },
    {
      q: 'Does the skill kit itself cost anything?',
      a: 'No. npx skills add into any AI agent (Claude Code / Codex / Cursor, etc.) is completely free — platform billing only applies to server-side capabilities (PDF export / job finding).',
    },
  ],
};

export function getPricingContent(locale: Locale): PricingContent {
  return locale === 'en' ? en : zh;
}
