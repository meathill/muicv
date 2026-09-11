import type { BillingInterval, Currency, SubscriptionPlanKey, TopupPackKey } from '@muicv/shared';

/**
 * Stripe Price ID 注册表。
 *
 * 维护惯例：
 *   - **live mode 实际 priceId**。test mode 当前未维护（无 Product），如需启用 test，
 *     在 packages/website 顶层把整张表 swap 出来（或者引入 `STRIPE_MODE` env 维一份分支表）。
 *   - 价格本身（金额、currency、interval）在 Stripe Dashboard 维护；这里只记 ID，不记金额。
 *     金额与 token 量在 packages/shared/src/pricing.ts 的 SUBSCRIPTION_PLANS / TOPUP_PACKS 维护。
 *   - **订阅只卖 USD**：Stripe 本账户不支持 CNY recurring（Alipay 进不了 subscription mode，
 *     WeChat Pay 全平台不支持 recurring），故 STRIPE_SUBSCRIPTION_PRICES 只有 usd。
 *     人民币只能买一次性 TOPUP_PACKS（微信 / 支付宝 / 卡），故 TOPUP 仍有 cny。
 *
 * 为什么不放进 wrangler vars：priceId 是结构化数据（plan × interval / pack × currency），
 * jsonc 的扁平 key-value 难以维护、容易漏改 worker-configuration.d.ts。TS 常量提供 typed access、
 * 一次性改完 IDE 全跟得上、增减档位时不会忘 d.ts 同步。
 *
 * webhook 反查（priceId → tokens）也共用本表，避免 lib/stripe.ts 写一堆 if-else。
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
 * 若已有 CN 用户用国际卡成功订阅，其续费 `invoice.paid` 仍会带这些 price ID。
 * 只把它们从「可售表」摘掉（Checkout 不再能选中），但保留在**反查表**里，
 * 让存量订阅的续费继续正常入账——否则会变成对已付费用户的静默少发 token。
 *
 * 用 `scripts/check-legacy-cny-subscriptions.ts` 确认 Stripe 侧已无 active 订阅后，
 * 可以连同这个常量一起删掉。
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

/**
 * 反查表：priceId → 订阅档位元信息。webhook 处理 invoice.paid /
 * customer.subscription.* 时 O(1) 反查 tokens / plan / interval。
 *
 * 由 STRIPE_SUBSCRIPTION_PRICES 构建，结构变化时自动同步，不需要单独维护。
 */
export const SUBSCRIPTION_PRICE_META = buildSubscriptionReverseMap();

export const TOPUP_PRICE_META = buildTopupReverseMap();

export interface SubscriptionPriceMeta {
  plan: SubscriptionPlanKey;
  interval: BillingInterval;
  currency: Currency;
}

export interface TopupPriceMeta {
  pack: TopupPackKey;
  currency: Currency;
}

function buildSubscriptionReverseMap(): Map<string, SubscriptionPriceMeta> {
  const map = new Map<string, SubscriptionPriceMeta>();
  for (const plan of Object.keys(STRIPE_SUBSCRIPTION_PRICES) as SubscriptionPlanKey[]) {
    for (const interval of Object.keys(STRIPE_SUBSCRIPTION_PRICES[plan]) as BillingInterval[]) {
      // 订阅表只有 USD。
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
