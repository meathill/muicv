import {
  type BillingInterval,
  type Currency,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanKey,
  TOPUP_PACKS,
  type TopupPackKey,
} from './pricing.ts';

/**
 * Stripe Price ID 注册表 + priceId 反查。website / api 两端共用同一份。
 *
 * 为什么放 shared 而不是 packages/website：桌面 app 的 `GET /me` 要把订阅的
 * `stripePriceId` 反查成 plan 来显示会员档位，而它跑在 packages/api worker 上。
 * 过去 api 自己维护了一份 `env.STRIPE_PRICE_*` 映射，结果两边 price ID 代际不同步
 * （Pro 月付/年付 ID 完全是另一批），导致 Pro 订阅用户在桌面 app 里被显示成免费版。
 * 现在唯一真值源在这里，两端 import 同一个常量表，结构上不可能再漂移。
 *
 * 维护惯例：
 *   - **live mode 实际 priceId**（公开标识符，可入 git），金额 / currency / interval
 *     在 Stripe Dashboard 维护；token 量在 pricing.ts 的 SUBSCRIPTION_PLANS / TOPUP_PACKS。
 *   - **订阅只卖 USD**：Stripe 本账户不支持 CNY recurring（Alipay 进不了 subscription mode，
 *     WeChat Pay 全平台不支持 recurring，国内银联卡也常被拒），人民币只用于一次性
 *     TOPUP_PACKS（微信 / 支付宝 / 卡）。
 *   - 增减档位改这里 + pricing.ts；两端自动同步。
 */

export const STRIPE_SUBSCRIPTION_PRICES: Record<SubscriptionPlanKey, Record<BillingInterval, string>> = {
  pro: {
    monthly: 'price_1TUjjpEpkXm2vxXT7PRayf4m',
    yearly: 'price_1TUjkFEpkXm2vxXTqDLQ6kon',
  },
  max: {
    monthly: 'price_1TRwcYEpkXm2vxXTolTABRBM',
    yearly: 'price_1TRwczEpkXm2vxXTxoxuOYjq',
  },
};

/**
 * 历史遗留：2026-09 人民币订阅下线前建的 4 个 CNY recurring price（Pro/Max × 月/年）。
 *
 * 为什么不直接删：Stripe 在 CN 订阅上虽然拒了 Alipay/WeChat，但**允许 card**——
 * 不能排除已有 CN 用户用国际卡成功订阅过。只把它们从「可售表」摘掉（Checkout 不再能选中），
 * 但保留在**反查表**里，让存量订阅的续费继续正常入账——否则会变成对已付费用户的静默少发 token。
 *
 * 真正确认 Stripe 侧无有效订阅后再删。
 */
export const LEGACY_CNY_SUBSCRIPTION_PRICES: Partial<
  Record<SubscriptionPlanKey, Partial<Record<BillingInterval, string>>>
> = {
  pro: { monthly: 'price_1TYhiLEpkXm2vxXT9cIp3sgU', yearly: 'price_1TYhiOEpkXm2vxXTy4hiIfsz' },
  max: { monthly: 'price_1TYhiPEpkXm2vxXTvLXLAsJ4', yearly: 'price_1TYhiREpkXm2vxXTjK1c0cTC' },
};

export const STRIPE_TOPUP_PRICES: Record<TopupPackKey, Record<Currency, string>> = {
  small: { usd: 'price_1TUjkrEpkXm2vxXTOgEMjxDE', cny: 'price_1TYhiSEpkXm2vxXT2b9Rhxzc' },
  medium: { usd: 'price_1TUjlcEpkXm2vxXTgr6Od5el', cny: 'price_1TYhiWEpkXm2vxXTNPu2K7BG' },
  large: { usd: 'price_1TUjm2EpkXm2vxXTy8UHK9qo', cny: 'price_1TYhiXEpkXm2vxXTRa0HfBus' },
};

export interface SubscriptionPriceMeta {
  plan: SubscriptionPlanKey;
  interval: BillingInterval;
  currency: Currency;
}

export interface TopupPriceMeta {
  pack: TopupPackKey;
  currency: Currency;
}

/** 反查表：priceId → 订阅档位元信息。webhook / `/me` 用。 */
export const SUBSCRIPTION_PRICE_META = buildSubscriptionReverseMap();

/** 反查表：priceId → 补充包元信息。 */
export const TOPUP_PRICE_META = buildTopupReverseMap();

/** 订阅 plan + interval → Stripe price id。订阅只卖 USD，故无 currency 维度。 */
export function planKeyToPriceId(plan: SubscriptionPlanKey, interval: BillingInterval): string {
  return STRIPE_SUBSCRIPTION_PRICES[plan][interval];
}

export function topupPackToPriceId(pack: TopupPackKey, currency: Currency): string {
  return STRIPE_TOPUP_PRICES[pack][currency];
}

/** Stripe price id → ('pro'|'max', 'monthly'|'yearly')。订阅状态卡 / `/me` 用。 */
export function priceIdToPlanInterval(
  priceId: string,
): { plan: SubscriptionPlanKey; interval: BillingInterval } | null {
  const meta = SUBSCRIPTION_PRICE_META.get(priceId);
  if (!meta) return null;
  return { plan: meta.plan, interval: meta.interval };
}

/** Stripe price id → plan key。`/me` 只关心档位、不需要 interval 时用这个。 */
export function planFromPriceId(priceId: string): SubscriptionPlanKey | null {
  return SUBSCRIPTION_PRICE_META.get(priceId)?.plan ?? null;
}

/**
 * Stripe price id → 一个 cycle 上账的 token 数（月付每月，年付每年一次性）。
 * webhook 处理 invoice.paid 时按这个上账。
 * priceId 不在表里就返 null（可能是被人在 Stripe 后台手动绑了未知 price，需告警）。
 */
export function priceIdToCycleTokens(priceId: string): number | null {
  const meta = SUBSCRIPTION_PRICE_META.get(priceId);
  if (!meta) return null;
  return SUBSCRIPTION_PLANS[meta.plan][meta.interval].tokens;
}

/**
 * Stripe price id → 一次性补充包 token 数。webhook 处理 checkout.session.completed
 * (mode=payment) 时按这个上账。USD 与 CNY 同档返同 token。
 */
export function priceIdToTopupTokens(priceId: string): number | null {
  const meta = TOPUP_PRICE_META.get(priceId);
  if (!meta) return null;
  return TOPUP_PACKS[meta.pack].tokens;
}

function buildSubscriptionReverseMap(): Map<string, SubscriptionPriceMeta> {
  const map = new Map<string, SubscriptionPriceMeta>();
  for (const plan of Object.keys(STRIPE_SUBSCRIPTION_PRICES) as SubscriptionPlanKey[]) {
    for (const interval of Object.keys(STRIPE_SUBSCRIPTION_PRICES[plan]) as BillingInterval[]) {
      map.set(STRIPE_SUBSCRIPTION_PRICES[plan][interval], { plan, interval, currency: 'usd' });
    }
  }
  // 并入历史 CNY recurring price：Checkout 选不中它们（forward 表里没有），
  // 但存量订阅的续费 invoice 仍能被识别、正常入账。
  for (const plan of Object.keys(LEGACY_CNY_SUBSCRIPTION_PRICES) as SubscriptionPlanKey[]) {
    const byInterval = LEGACY_CNY_SUBSCRIPTION_PRICES[plan];
    if (!byInterval) continue;
    for (const interval of Object.keys(byInterval) as BillingInterval[]) {
      const priceId = byInterval[interval];
      if (priceId) map.set(priceId, { plan, interval, currency: 'cny' });
    }
  }
  return map;
}

function buildTopupReverseMap(): Map<string, TopupPriceMeta> {
  const map = new Map<string, TopupPriceMeta>();
  for (const pack of Object.keys(STRIPE_TOPUP_PRICES) as TopupPackKey[]) {
    for (const currency of Object.keys(STRIPE_TOPUP_PRICES[pack]) as Currency[]) {
      map.set(STRIPE_TOPUP_PRICES[pack][currency], { pack, currency });
    }
  }
  return map;
}
