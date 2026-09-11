import { getPlanLabel } from '@muicv/shared';
import { ArrowClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { DASHBOARD_URL, ExternalButton } from './bits';

export function PlanCard({
  plan,
  balance,
  onRefresh,
}: {
  plan: 'free' | 'pro' | 'max' | undefined;
  balance: number;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // server 漏返字段时兜底为免费版（不能像之前那样掉到 Max）。
  const safePlan: 'free' | 'pro' | 'max' = plan ?? 'free';

  async function handleRefresh() {
    setRefreshing(true);
    setJustSynced(false);
    try {
      await onRefresh();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 1800);
    } finally {
      setRefreshing(false);
    }
  }

  const planLabel = getPlanLabel(safePlan);
  const hint =
    safePlan === 'free'
      ? '免费版可以正常聊天和整理素材。升级 Pro 解锁 PDF 导出、招聘抓取、辅助投递等。'
      : safePlan === 'pro'
        ? '已是 Pro 会员。需要无限制？升级 Max。'
        : '已是 Max 会员，所有功能无限制。';

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">会员档位</p>
          <div className="mt-2 text-[16px] font-bold text-ink">
            当前：<span className="rounded-md bg-fluff px-2 py-0.5">{planLabel}</span>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border-2 border-rule-strong bg-paper px-3 py-2 text-right">
          <p className="font-mono text-[12px] uppercase tracking-wider text-mute">余额</p>
          <p className="mt-0.5 font-mono text-[16px] font-extrabold tabular-nums text-ink">{formatTokens(balance)}</p>
          <p className="text-[12px] text-mute">tokens</p>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-[1.6] text-mute">{hint}</p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <ExternalButton href={`${DASHBOARD_URL}#plans`} label="去看会员权益 →" primary={safePlan === 'free'} />
        <ExternalButton href={`${DASHBOARD_URL}#wallet`} label="充值 →" />
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          title="在网页升级 / 充值后回来点这个，立刻同步"
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-3.5 py-1.5 text-[12px] font-bold text-ink-soft hover:bg-fluff hover:text-ink disabled:opacity-60"
        >
          {refreshing ? (
            <span>同步中…</span>
          ) : justSynced ? (
            <>
              <CheckIcon size={12} weight="bold" />
              <span>已是最新</span>
            </>
          ) : (
            <>
              <ArrowClockwiseIcon size={12} weight="bold" />
              <span>同步状态</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1) return Math.round(n).toLocaleString();
  return n.toFixed(2);
}
