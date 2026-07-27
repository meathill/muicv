'use client';

import {
  type BillingInterval,
  type Currency,
  type SubscriptionPlanKey,
  type TopupPackKey,
  CN_PACKS,
  SUBSCRIPTION_PLANS,
  TOPUP_PACKS,
} from '@muicv/shared';
import { useState } from 'react';

import { CnPackButton } from '@/components/cn-pack-button';
import { CurrencyToggle } from '@/components/currency-toggle';

/**
 * Stripe 跳转按钮的 client component。
 *
 * 三类操作：
 *   - 升级订阅（月付 / 年付）：POST /api/checkout → location.href = url
 *   - 买补充包：POST /api/topup → location.href = url
 *   - 管理订阅：POST /api/billing/portal → Stripe Portal
 *
 * 都返回 hosted URL；无前端 Stripe SDK 依赖（省 80KB bundle）。
 *
 * `currency` 由父级 server component（plans-section）注入，决定订阅卡 / topup 卡上
 * 显示哪一套文案。币种切换 UI 在右上 CurrencyToggle，切换后写 cookie + router.refresh()。
 */
export function BillingActions({
  hasActiveSubscription,
  currency,
  cnPackMonthlyCooldownEnd,
  cnPackYearlyCooldownEnd,
}: {
  hasActiveSubscription: boolean;
  currency: Currency;
  cnPackMonthlyCooldownEnd: Date | null;
  cnPackYearlyCooldownEnd: Date | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>('monthly');

  async function jumpTo(endpoint: string, body: unknown, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
      if (!res.ok || !data.url) {
        setError(data.message || data.error || `请求失败（${res.status}）`);
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <CurrencyToggle currency={currency} />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[16px] font-extrabold text-ink">订阅（自动续 Token）</h3>
          {!hasActiveSubscription && (
            <div className="inline-flex rounded-lg border-2 border-rule bg-paper p-0.5 text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`rounded-md px-3 py-1 ${
                  interval === 'monthly'
                    ? 'bg-yellow text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)]'
                    : 'text-ink-soft'
                }`}
              >
                月付
              </button>
              <button
                type="button"
                onClick={() => setInterval('yearly')}
                className={`rounded-md px-3 py-1 ${
                  interval === 'yearly'
                    ? 'bg-yellow text-ink shadow-[0_2px_0_0_var(--color-yellow-shadow)]'
                    : 'text-ink-soft'
                }`}
              >
                年付 <span className="ml-0.5 text-[12px] text-yellow-deep">省 ≈20%</span>
              </button>
            </div>
          )}
        </div>
        <p className="mt-1 text-[12px] text-ink-soft">
          {hasActiveSubscription
            ? '已订阅；切换档位 / 取消请走"管理订阅"。'
            : interval === 'yearly'
              ? '年付：一次性收一年钱，立即到账整年 Token，Token 永不过期。'
              : '月付：每月自动续 Token。'}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['pro', 'max'] as SubscriptionPlanKey[]).map((key) => {
            const plan = SUBSCRIPTION_PLANS[key];
            const cycle = plan[interval];
            // CN 视图：订阅档以 CN「月包/年包」一次性 SKU 形式出售（绕开 alipay 不能 subscription）。
            if (currency === 'cny') {
              const cnPackKey = `${key}-${interval}` as const;
              const cnPack = CN_PACKS[cnPackKey];
              const cooldownEnd = interval === 'monthly' ? cnPackMonthlyCooldownEnd : cnPackYearlyCooldownEnd;
              return (
                <div
                  key={key}
                  className="flex flex-col gap-2 rounded-xl border-2 border-ink bg-cream px-4 py-3 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="block text-[14px] font-extrabold text-ink">{plan.label}</span>
                      <span className="block font-mono text-[12px] text-mute">
                        {cycle.tokens.toLocaleString()} tokens / {interval === 'yearly' ? '年' : '月'}
                      </span>
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-yellow-deep">
                      {cycle.display.cny}
                    </span>
                  </div>
                  <CnPackButton pack={cnPackKey} label={`购买 ${cnPack.label}`} cooldownEnd={cooldownEnd} />
                  <p className="text-[11px] leading-snug text-mute">
                    国内一次性付费 · 同周期 {cnPack.cooldownDays} 天内限购一次
                  </p>
                </div>
              );
            }
            return (
              <button
                key={key}
                type="button"
                disabled={busy !== null || hasActiveSubscription}
                onClick={() => jumpTo('/api/checkout', { plan: key, interval }, `plan-${key}-${interval}`)}
                className="press-ink flex items-center justify-between rounded-xl border-2 border-ink bg-cream px-4 py-3 text-left disabled:opacity-50"
              >
                <span>
                  <span className="block text-[14px] font-extrabold text-ink">{plan.label}</span>
                  <span className="block font-mono text-[12px] text-mute">
                    {cycle.tokens.toLocaleString()} tokens / {interval === 'yearly' ? '年' : '月'}
                  </span>
                </span>
                <span className="font-mono text-[14px] font-bold tabular-nums text-yellow-deep">
                  {cycle.display[currency]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[16px] font-extrabold text-ink">补充包（一次性买）</h3>
        <p className="mt-1 text-[12px] text-ink-soft">没订阅也能用。买完立刻到账，永不过期。</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(['small', 'medium', 'large'] as TopupPackKey[]).map((key) => {
            const pack = TOPUP_PACKS[key];
            return (
              <button
                key={key}
                type="button"
                disabled={busy !== null}
                onClick={() => jumpTo('/api/topup', { pack: key }, `topup-${key}`)}
                className="press-ink flex flex-col items-start gap-1 rounded-xl border-2 border-rule bg-cream px-4 py-3 text-left hover:border-corgi disabled:opacity-50"
              >
                <span className="font-mono text-[12px] uppercase tracking-wider text-mute">{key}</span>
                <span className="text-[16px] font-extrabold text-ink">{pack.tokens.toLocaleString()} tokens</span>
                <span className="font-mono text-[12px] tabular-nums text-yellow-deep">{pack.display[currency]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveSubscription && (
        <div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => jumpTo('/api/billing/portal', {}, 'portal')}
            className="press inline-flex items-center gap-1.5 rounded-xl bg-yellow px-4 py-2 text-[14px] font-bold text-ink disabled:opacity-50"
          >
            {busy === 'portal' ? '跳转中…' : '管理订阅 / 看发票 / 切换档位'}
          </button>
        </div>
      )}

      {error && <div className="rounded-lg border border-amber bg-fluff px-3 py-2 text-[12px] text-ink">{error}</div>}
    </div>
  );
}
