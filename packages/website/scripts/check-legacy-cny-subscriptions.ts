/**
 * 一次性核查：Stripe 侧还有没有挂在历史 CNY recurring price 上的订阅。
 *
 * 背景：2026-09 人民币订阅下线（代码见 lib/stripe-prices.ts 的 LEGACY_CNY_SUBSCRIPTION_PRICES）。
 * 虽然 Stripe 拒了 Alipay / WeChat 进 subscription mode，但允许 card —— 不能排除
 * 已有 CN 用户用国际卡订阅过。代码已保留 4 个 LEGACY price 的反查，让存量续费正常入账；
 * 本脚本用来确认 Stripe 侧是否真的没有存量订阅，确认后即可删除那 4 个 price 常量。
 *
 * 用法（key 不进仓库，用环境变量传入）：
 *   STRIPE_SECRET_KEY=sk_live_xxx node packages/website/scripts/check-legacy-cny-subscriptions.ts
 *
 * 只读：只调 Stripe 的 list API，不改任何数据。
 */
import Stripe from 'stripe';

const LEGACY_CNY_PRICE_IDS = [
  ['Pro 月付', 'price_1TYhiLEpkXm2vxXT9cIp3sgU'],
  ['Pro 年付', 'price_1TYhiOEpkXm2vxXTy4hiIfsz'],
  ['Max 月付', 'price_1TYhiPEpkXm2vxXTvLXLAsJ4'],
  ['Max 年付', 'price_1TYhiREpkXm2vxXTjK1c0cTC'],
] as const;

/** 会继续产生 invoice.paid、需要正常入账的状态。 */
const BILLING_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('缺少 STRIPE_SECRET_KEY 环境变量。用法见文件头注释。');
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: '2026-08-26.dahlia' });
  console.log(`核查 ${LEGACY_CNY_PRICE_IDS.length} 个历史 CNY recurring price：\n`);

  let live = 0;
  for (const [label, priceId] of LEGACY_CNY_PRICE_IDS) {
    // list 的 price 参数按 price id 过滤；状态在本地筛（list 一次只接受一个 status）。
    const subs = await stripe.subscriptions.list({ price: priceId, limit: 100 });
    const billable = subs.data.filter((s) => BILLING_STATUSES.has(s.status));
    if (billable.length > 0) {
      live += billable.length;
      console.warn(`⚠ ${label} (${priceId}): ${billable.length} 个有效订阅`);
      for (const sub of billable) {
        const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        console.warn(`    - ${sub.id}  status=${sub.status}  customer=${customer}`);
      }
    } else {
      const otherCount = subs.data.length;
      console.log(`✓ ${label} (${priceId}): 无有效订阅${otherCount ? `（有 ${otherCount} 个已取消/过期）` : ''}`);
    }
  }

  if (live === 0) {
    console.log('\n结论：没有存量 CNY 订阅，可以安全删除 LEGACY_CNY_SUBSCRIPTION_PRICES 常量。');
  } else {
    console.log(`\n结论：还有 ${live} 个有效订阅，**先不要删**常量，等它们到期 / 取消。`);
  }
}

main().catch((err) => {
  console.error('核查失败：', err instanceof Error ? err.message : err);
  process.exit(1);
});
