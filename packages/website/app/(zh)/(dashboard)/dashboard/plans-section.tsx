import { microToDisplay } from '@muicv/shared';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { getCnPackCooldownEnd } from '@/lib/cn-pack';
import { getDb, schema } from '@/lib/db';
import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { priceIdToPlanInterval } from '@/lib/stripe';
import { ensureBalance, listLedger } from '@/lib/wallet';

import { BillingActions } from './billing-actions';

const LEDGER_TYPE_LABEL: Record<string, string> = {
  signup_bonus: '注册赠送',
  subscription: '订阅续费',
  topup: '补充包',
  llm: '大语言模型调用',
  pdf_render: 'PDF 渲染',
  jd_fetch: '岗位抓取',
  admin_grant: '后台补发',
  admin_deduct: '后台扣款',
};

const SUB_STATUS_LABEL: Record<string, string> = {
  active: '生效中',
  trialing: '试用中',
  past_due: '续费失败（请修复支付方式）',
  canceled: '已取消',
  incomplete: '未完成',
  incomplete_expired: '未完成已过期',
  unpaid: '欠费',
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 钱包 / 订阅 / 补充包 / 流水 一站式。
 *
 * 用户点击月卡 / 补充包 / 管理订阅按钮 → BillingActions (client) → /api/checkout
 * | /api/topup | /api/billing/portal → 跳 Stripe hosted 页面 → 付款 → webhook
 * 入账（balance + ledger）→ 这个页面下次刷新看到结果。
 */
export async function PlansSection() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const userId = session.user.id;
  const wallet = await ensureBalance(userId);

  const db = await getDb();
  const subRows = await db
    .select({
      status: schema.subscription.status,
      monthlyTokens: schema.subscription.monthlyTokens,
      currentPeriodEnd: schema.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
      stripeSubscriptionId: schema.subscription.stripeSubscriptionId,
      stripePriceId: schema.subscription.stripePriceId,
    })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, userId))
    .limit(1);
  const sub = subRows[0];
  const hasActive =
    !!sub?.stripeSubscriptionId && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due');

  // 反查月付 / 年付，给状态卡显示正确的 cycle 单位
  const subMeta = sub?.stripePriceId ? priceIdToPlanInterval(sub.stripePriceId) : null;
  const cycleLabel = subMeta?.interval === 'yearly' ? '年' : '月';

  const ledger = await listLedger(userId, { limit: 15 });
  const currency = getRequestCurrency({ headers: await headers() });
  // CN 视图：订阅卡走「月包/年包」，server 端预查 cooldown 后透传给 client。
  const [cnPackMonthlyCooldown, cnPackYearlyCooldown] =
    currency === 'cny'
      ? await Promise.all([getCnPackCooldownEnd(userId, 'monthly'), getCnPackCooldownEnd(userId, 'yearly')])
      : [null, null];

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 余额与计费</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">
          余额{' '}
          <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">
            {microToDisplay(wallet.balance).toLocaleString()}
          </span>{' '}
          tokens
        </h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          所有云端服务（大语言模型调用、PDF 渲染、岗位抓取）按 Token 扣费；自带 API 的用户，大语言模型调用走自己的
          muirouter 余额， PDF 渲染、岗位抓取仍按本余额扣。Token 永不过期。
        </p>
      </header>

      {hasActive && sub && (
        <div className="mt-5 rounded-xl border-2 border-yellow-deep bg-fluff p-4 text-[14px] leading-[1.7]">
          <p className="font-bold text-ink">
            订阅状态：{SUB_STATUS_LABEL[sub.status] ?? sub.status}
            {sub.cancelAtPeriodEnd ? '（周期末取消）' : ''}
          </p>
          {sub.currentPeriodEnd && (
            <p className="mt-1 text-ink-soft">
              下次{sub.cancelAtPeriodEnd ? '到期' : '续费'}时间：{formatTimestamp(sub.currentPeriodEnd.getTime())}
              {sub.monthlyTokens != null && (
                <span className="ml-1">
                  （续费时 +{sub.monthlyTokens.toLocaleString()} tokens / {cycleLabel}）
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <BillingActions
          hasActiveSubscription={hasActive}
          currency={currency}
          cnPackMonthlyCooldownEnd={cnPackMonthlyCooldown}
          cnPackYearlyCooldownEnd={cnPackYearlyCooldown}
        />
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <h3 className="text-[16px] font-extrabold text-ink">最近交易</h3>
        {ledger.length === 0 ? (
          <p className="mt-2 text-[12px] text-mute">还没有任何交易。</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule">
            {ledger.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 py-2 text-[14px]">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{LEDGER_TYPE_LABEL[row.type] ?? row.type}</p>
                  <p className="font-mono text-[12px] text-mute">{formatTimestamp(row.createdAt)}</p>
                </div>
                <span
                  className={`font-mono text-[14px] font-bold tabular-nums ${
                    row.delta > 0 ? 'text-yellow-deep' : 'text-ink-soft'
                  }`}
                >
                  {row.delta > 0 ? '+' : ''}
                  {microToDisplay(row.delta).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
