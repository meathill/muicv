'use client';

import { type BillingInterval, type Currency, CN_PACKS, SUBSCRIPTION_PLANS, TOPUP_PACKS } from '@muicv/shared';
import { useEffect, useState } from 'react';

import { CnPackButton } from '@/components/cn-pack-button';
import { CurrencyToggle } from '@/components/currency-toggle';

import { type Locale, localizedHref } from '../_i18n/locale';
import { ArrowUpRight, Sparkle } from '../_icons';
import { BuyButton } from './_buy-button';
import { getPricingContent, type PricingContent } from './_content';

type SubTier = {
  key: keyof typeof SUBSCRIPTION_PLANS;
  tagline: string;
  staticFeatures: string[];
  highlight?: boolean;
  badge?: string;
};

type PricingState = {
  isLoggedIn: boolean;
  hasActiveSub: boolean;
  currency: Currency;
  cnPackCooldown: { monthly: string | null; yearly: string | null };
};

/**
 * Pricing 页动态区（客户端）。
 *
 * 页面本体是静态壳（ISR / 构建期预渲染），登录态 / 订阅状态 / 币种 / CN 包 cooldown
 * 由 GET /api/pricing/state 挂载后一次拿齐；interval 只在本地维护并同步到 URL。
 * 币种未返回前价格位显示占位符，避免「先 $ 后 ¥」闪烁。
 */
export function PricingClient({ locale }: { locale: Locale }) {
  const c = getPricingContent(locale);
  const [state, setState] = useState<PricingState | null>(null);
  const [interval, setBillingInterval] = useState<BillingInterval>('monthly');

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('interval');
    if (param === 'yearly') setBillingInterval('yearly');
  }, []);

  useEffect(() => {
    fetch('/api/pricing/state')
      .then((res) => (res.ok ? (res.json() as Promise<PricingState>) : null))
      .then((data) => {
        if (data) setState(data);
      })
      .catch(() => {
        // 拿不到动态数据就保持默认（未登录 / usd），页面照常可用
      });
  }, []);

  const isLoggedIn = !!state?.isLoggedIn;
  const hasActiveSub = !!state?.hasActiveSub;
  const currency = state?.currency ?? null;
  const cooldownEnd = state?.cnPackCooldown[interval] ? new Date(state.cnPackCooldown[interval]) : null;

  function handleCurrencySwitch(next: Currency) {
    setState((s) => (s ? { ...s, currency: next } : s));
  }

  const subTiers: SubTier[] = [
    {
      key: 'pro',
      tagline: c.tiers.pro.tagline,
      staticFeatures: c.tiers.pro.features,
      highlight: true,
      badge: c.tiers.pro.badge,
    },
    { key: 'max', tagline: c.tiers.max.tagline, staticFeatures: c.tiers.max.features },
  ];

  return (
    <>
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <IntervalToggle current={interval} onChange={setBillingInterval} c={c} />
          <div className="mt-4 flex justify-center">
            {currency ? <CurrencyToggle currency={currency} onSwitch={handleCurrencySwitch} /> : null}
          </div>
        </div>
      </div>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-5 md:grid-cols-3">
            <FreeCard isLoggedIn={isLoggedIn} c={c} locale={locale} />
            {subTiers.map((tier) => (
              <SubscriptionCard
                key={tier.key}
                tier={tier}
                interval={interval}
                currency={currency}
                cooldownEnd={cooldownEnd}
                isLoggedIn={isLoggedIn}
                hasActiveSub={hasActiveSub}
                c={c}
                locale={locale}
              />
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-[20px] font-extrabold text-ink">{c.topupHeading}</h2>
            <p className="mt-2 max-w-2xl text-[14px] text-ink-soft">{c.topupDesc}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {(['small', 'medium', 'large'] as const).map((key) => {
                const pack = TOPUP_PACKS[key];
                return (
                  <div key={key} className="flex flex-col rounded-xl border-2 border-rule bg-cream p-5">
                    <p className="font-mono text-[12px] uppercase tracking-wider text-mute">{key}</p>
                    <p className="mt-2 text-[20px] font-extrabold text-ink tabular-nums">
                      {pack.tokens.toLocaleString()} tokens
                    </p>
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-yellow-deep">
                      {currency ? pack.display[currency] : PRICE_PLACEHOLDER}
                    </p>
                    {isLoggedIn ? (
                      <BuyButton kind="topup" pack={key} label={c.buyNow} />
                    ) : (
                      <a
                        href={localizedHref(locale, '/sign-up')}
                        className="press-ink mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-cream px-4 py-2 text-[14px] font-bold text-ink"
                      >
                        {c.signUpToBuy}
                        <ArrowUpRight />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const PRICE_PLACEHOLDER = '—';

function IntervalToggle({
  current,
  onChange,
  c,
}: {
  current: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  c: PricingContent;
}) {
  return (
    <div className="mx-auto mt-6 inline-flex rounded-full border-2 border-ink bg-cream p-1 text-[14px] font-bold shadow-[0_3px_0_0_var(--color-yellow-shadow)]">
      {(['monthly', 'yearly'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            onChange(value);
            const url = new URL(window.location.href);
            url.searchParams.set('interval', value);
            window.history.replaceState(null, '', url);
          }}
          className={`rounded-full px-4 py-1.5 transition-colors ${
            current === value ? 'bg-yellow text-ink' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {value === 'monthly' ? c.toggleMonthly : c.toggleYearly}
          {value === 'yearly' && <span className="ml-1 font-mono text-[12px] text-yellow-deep">{c.toggleSavings}</span>}
        </button>
      ))}
    </div>
  );
}

function FreeCard({ isLoggedIn, c, locale }: { isLoggedIn: boolean; c: PricingContent; locale: Locale }) {
  const ctaHref = localizedHref(locale, isLoggedIn ? '/dashboard' : '/sign-up');
  const ctaLabel = isLoggedIn ? c.free.ctaSignedIn : c.free.ctaSignedOut;
  return (
    <article className="relative flex flex-col rounded-xl border-2 border-rule bg-cream p-6 transition-transform hover:-translate-y-1">
      <h3 className="text-[20px] font-extrabold text-ink">{c.free.title}</h3>
      <p className="mt-1 text-[14px] leading-[1.6] text-ink-soft">{c.free.sub}</p>
      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-ink tabular-nums">10,000</span>
          <span className="text-[14px] font-bold text-ink-soft">tokens</span>
        </div>
        <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-mute">{c.free.grantNote}</p>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-[14px] leading-[1.6]">
        {c.free.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-ink-soft">
            <CheckBullet /> {b}
          </li>
        ))}
      </ul>
      <a
        href={ctaHref}
        className="press-ink mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-cream px-4 py-2.5 text-[14px] font-bold text-ink"
      >
        {ctaLabel}
        <ArrowUpRight />
      </a>
    </article>
  );
}

function SubscriptionCard({
  tier,
  interval,
  currency,
  cooldownEnd,
  isLoggedIn,
  hasActiveSub,
  c,
  locale,
}: {
  tier: SubTier;
  interval: BillingInterval;
  currency: Currency | null;
  cooldownEnd: Date | null;
  isLoggedIn: boolean;
  hasActiveSub: boolean;
  c: PricingContent;
  locale: Locale;
}) {
  const plan = SUBSCRIPTION_PLANS[tier.key];
  const cycle = plan[interval];
  // CN 视图：用一次性 CN 包替代订阅 SKU。key 形如 'pro-monthly'。
  const cnPackKey = `${tier.key}-${interval}` as const;
  const cnPack = CN_PACKS[cnPackKey];
  const tokenLine = interval === 'yearly' ? c.tokenLineYearly : c.tokenLineMonthly;
  const features = [`${tokenLine} ${cycle.tokens.toLocaleString()} tokens`, ...tier.staticFeatures];

  return (
    <article
      className={
        tier.highlight
          ? 'relative flex flex-col rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_5px_0_0_var(--color-yellow-shadow)]'
          : 'relative flex flex-col rounded-xl border-2 border-rule bg-cream p-6 transition-transform hover:-translate-y-1'
      }
    >
      {tier.badge && (
        <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-yellow px-3 py-0.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)]">
          <Sparkle />
          {tier.badge}
        </span>
      )}
      <h3 className="text-[20px] font-extrabold text-ink">{plan.label}</h3>
      <p className="mt-1 text-[14px] leading-[1.6] text-ink-soft">{tier.tagline}</p>
      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-ink tabular-nums">
            {currency ? cycle.display[currency] : PRICE_PLACEHOLDER}
          </span>
        </div>
        <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-mute">
          {interval === 'yearly' ? c.cardPerYear : c.cardPerMonth} {cycle.tokens.toLocaleString()} tokens
        </p>
        {interval === 'yearly' && 'savingsLabel' in cycle && (
          <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-yellow-deep">
            {currency ? cycle.savingsLabel[currency] : PRICE_PLACEHOLDER}
          </p>
        )}
      </div>
      <ul className="mt-6 flex-1 space-y-2.5 text-[14px] leading-[1.6]">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-ink-soft">
            <CheckBullet />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!isLoggedIn && (
        <a
          href={localizedHref(locale, '/sign-up')}
          className={
            tier.highlight
              ? 'press mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink'
              : 'press-ink mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-cream px-4 py-2.5 text-[14px] font-bold text-ink'
          }
        >
          {c.signUpToSubscribe}
          <ArrowUpRight />
        </a>
      )}
      {isLoggedIn && hasActiveSub && <BuyButton kind="portal" label={c.manageSub} primary={!!tier.highlight} />}
      {isLoggedIn && !hasActiveSub && currency === 'cny' && (
        <>
          <CnPackButton
            pack={cnPackKey}
            label={`${c.cnBuyPrefix}${cnPack.label}`}
            cooldownEnd={cooldownEnd}
            primary={!!tier.highlight}
          />
          <p className="mt-2 text-center text-[12px] leading-snug text-mute">{c.cnPackNote(cnPack.cooldownDays)}</p>
        </>
      )}
      {isLoggedIn && !hasActiveSub && currency !== 'cny' && (
        <BuyButton
          kind="subscription"
          plan={tier.key}
          interval={interval}
          label={c.subscribeNow}
          primary={!!tier.highlight}
        />
      )}
    </article>
  );
}

function CheckBullet() {
  return (
    <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-fluff text-yellow-deep">
      ✓
    </span>
  );
}
