import { type BillingInterval, CN_PACKS, type Currency, SUBSCRIPTION_PLANS, TOPUP_PACKS } from '@muicv/shared';
import { headers } from 'next/headers';

import { CnPackButton } from '@/components/cn-pack-button';
import { CurrencyToggle } from '@/components/currency-toggle';
import { getAuth } from '@/lib/auth';
import { getCnPackCooldownEnd } from '@/lib/cn-pack';
import { getRequestCurrency } from '@/lib/region';
import { getActiveSubscription } from '@/lib/subscription';

import { getDictionary, type Locale, localizedHref } from '../_i18n/dict';
import { ArrowUpRight, Highlight, Sparkle } from '../_icons';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';
import { BuyButton } from './_buy-button';
import { getPricingContent, type PricingContent } from './_content';

type SubTier = {
  key: keyof typeof SUBSCRIPTION_PLANS;
  tagline: string;
  staticFeatures: string[];
  highlight?: boolean;
  badge?: string;
};

export async function PricingView({ locale, intervalParam }: { locale: Locale; intervalParam: string | undefined }) {
  const c = getPricingContent(locale);
  const dict = getDictionary(locale);
  const requestHeaders = await headers();
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const isLoggedIn = !!session?.user;
  const activeSub = await getActiveSubscription(session?.user?.id);
  const hasActiveSub = !!activeSub;

  const interval: BillingInterval = intervalParam === 'yearly' ? 'yearly' : 'monthly';
  const currency = getRequestCurrency({ headers: requestHeaders });

  // CN 视图订阅卡走「月包/年包」一次性 SKU；server 端查 cooldown，client 受控显示锁定状态。
  // 未登录用户不查（也不展示购买按钮，走 sign-up 流程），cooldownEnd 保留 null。
  const cnPackCooldown: Record<BillingInterval, Date | null> = { monthly: null, yearly: null };
  if (currency === 'cny' && session?.user) {
    [cnPackCooldown.monthly, cnPackCooldown.yearly] = await Promise.all([
      getCnPackCooldownEnd(session.user.id, 'monthly'),
      getCnPackCooldownEnd(session.user.id, 'yearly'),
    ]);
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
  const altHref = locale === 'zh' ? '/en/pricing' : '/pricing';

  return (
    <div className="relative">
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="absolute inset-0 bg-sun" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.heroEyebrow}</p>
            <h1 className="mt-3 text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              {c.heroTitleLead}
              <Highlight>{c.heroTitleHighlight}</Highlight>
              {c.heroTitleMid}
              <br />
              {c.heroTitleTail}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.7] text-ink-soft">{c.heroLede}</p>
            <IntervalToggle current={interval} c={c} locale={locale} />
            <div className="mt-4 flex justify-center">
              <CurrencyToggle currency={currency} />
            </div>
          </div>
        </div>
      </section>

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
                cnPackCooldownEnd={cnPackCooldown[interval]}
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
                    <p className="mt-1 font-mono text-[12px] tabular-nums text-yellow-deep">{pack.display[currency]}</p>
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

      <section className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {c.faqEyebrow}</p>
          <h2 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
            {c.faqTitle}
          </h2>
          <div className="mt-10 space-y-3">
            {c.faq.map((item, idx) => (
              <details
                key={item.q}
                className="group rounded-xl border-2 border-rule bg-cream transition-colors hover:border-corgi"
                open={idx === 0}
              >
                <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4">
                  <span className="mt-0.5 inline-flex h-7 shrink-0 items-center rounded-md bg-fluff px-2 font-mono text-[12px] font-bold tabular-nums text-yellow-deep">
                    Q{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[16px] font-bold leading-snug text-ink">{item.q}</span>
                  <span
                    className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fluff text-yellow-deep transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-rule px-5 pb-5 pt-4 pl-[4.5rem] text-[16px] leading-[1.7] text-ink-soft">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer dict={dict} locale={locale} />
    </div>
  );
}

function IntervalToggle({ current, c, locale }: { current: BillingInterval; c: PricingContent; locale: Locale }) {
  const base = localizedHref(locale, '/pricing');
  return (
    <div className="mx-auto mt-6 inline-flex rounded-full border-2 border-ink bg-cream p-1 text-[14px] font-bold shadow-[0_3px_0_0_var(--color-yellow-shadow)]">
      <a
        href={`${base}?interval=monthly`}
        className={`rounded-full px-4 py-1.5 transition-colors ${
          current === 'monthly' ? 'bg-yellow text-ink' : 'text-ink-soft hover:text-ink'
        }`}
      >
        {c.toggleMonthly}
      </a>
      <a
        href={`${base}?interval=yearly`}
        className={`rounded-full px-4 py-1.5 transition-colors ${
          current === 'yearly' ? 'bg-yellow text-ink' : 'text-ink-soft hover:text-ink'
        }`}
      >
        {c.toggleYearly} <span className="ml-1 font-mono text-[12px] text-yellow-deep">{c.toggleSavings}</span>
      </a>
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
  cnPackCooldownEnd,
  isLoggedIn,
  hasActiveSub,
  c,
  locale,
}: {
  tier: SubTier;
  interval: BillingInterval;
  currency: Currency;
  cnPackCooldownEnd: Date | null;
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
          <span className="text-3xl font-extrabold text-ink tabular-nums">{cycle.display[currency]}</span>
        </div>
        <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-mute">
          {interval === 'yearly' ? c.cardPerYear : c.cardPerMonth} {cycle.tokens.toLocaleString()} tokens
        </p>
        {interval === 'yearly' && 'savingsLabel' in cycle && (
          <p className="mt-1 font-mono text-[12px] uppercase tracking-wider text-yellow-deep">
            {cycle.savingsLabel[currency]}
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
            cooldownEnd={cnPackCooldownEnd}
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
