import { microToDisplay, priceIdToPlanInterval } from '@muicv/shared';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { getDb, schema } from '@/lib/db';
import { getRequestCurrency } from '@/lib/region';
import { getCurrentSession } from '@/lib/session';
import { ensureBalance, listLedger } from '@/lib/wallet';

import { BillingActions } from './billing-actions';

const LEDGER_TYPE_LABEL: Record<string, string> = {
  signup_bonus: 'Sign-up bonus',
  subscription: 'Subscription renewal',
  topup: 'Token pack',
  cn_pack: 'China monthly/yearly pack (legacy)',
  llm: 'LLM calls',
  pdf_render: 'PDF rendering',
  jd_fetch: 'Job fetching',
  stt_transcribe: 'Speech-to-text',
  tts: 'Text-to-speech',
  feedback_reward: 'Feedback reward',
  jd_contribute: 'Job contribution',
  job_submit: 'Job submission',
  job_submit_refund: 'Job submission refund',
  job_submit_reward: 'Job submission reward',
  admin_grant: 'Admin grant',
  admin_deduct: 'Admin deduction',
};

const SUB_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  trialing: 'Trialing',
  past_due: 'Payment failed (please fix your payment method)',
  canceled: 'Cancelled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Incomplete (expired)',
  unpaid: 'Unpaid',
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
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
  const cycleLabel = subMeta?.interval === 'yearly' ? 'year' : 'month';

  const ledger = await listLedger(userId, { limit: 15 });
  const currency = getRequestCurrency({ headers: await headers() });

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Balance & billing</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">
          Balance{' '}
          <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">
            {microToDisplay(wallet.balance).toLocaleString()}
          </span>{' '}
          tokens
        </h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          All cloud services (LLM calls, PDF rendering, job fetching) are billed in tokens. If you bring your own API,
          LLM calls use your own muirouter balance, while PDF rendering and job fetching still use this balance. Tokens
          never expire.
        </p>
      </header>

      {hasActive && sub && (
        <div className="mt-5 rounded-xl border-2 border-yellow-deep bg-fluff p-4 text-[14px] leading-[1.7]">
          <p className="font-bold text-ink">
            Subscription status: {SUB_STATUS_LABEL[sub.status] ?? sub.status}
            {sub.cancelAtPeriodEnd ? ' (cancels at period end)' : ''}
          </p>
          {sub.currentPeriodEnd && (
            <p className="mt-1 text-ink-soft">
              Next {sub.cancelAtPeriodEnd ? 'expiry' : 'renewal'}: {formatTimestamp(sub.currentPeriodEnd.getTime())}
              {sub.monthlyTokens != null && (
                <span className="ml-1">
                  (+{sub.monthlyTokens.toLocaleString()} tokens / {cycleLabel})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="mt-6">
        <BillingActions hasActiveSubscription={hasActive} currency={currency} />
      </div>

      <div className="mt-8 border-t border-rule pt-6">
        <h3 className="text-[16px] font-extrabold text-ink">Recent transactions</h3>
        {ledger.length === 0 ? (
          <p className="mt-2 text-[12px] text-mute">No transactions yet.</p>
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
