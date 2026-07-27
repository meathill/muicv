'use client';

import { useState } from 'react';

import { ArrowUpRight } from '../_icons';

/**
 * 首页 / pricing 上的购买按钮。
 *
 * 三种模式：
 *   - subscription：POST /api/checkout → Stripe Checkout (mode=subscription)
 *   - topup：POST /api/topup → Stripe Checkout (mode=payment)
 *   - portal：POST /api/billing/portal → Stripe Customer Portal（已订阅用户切档/取消/看发票）
 *
 * 全部走 server 拼好 hosted URL → location.href 跳转，前端不依赖 Stripe SDK。
 * 与 dashboard 的 [billing-actions.tsx] 行为对齐，但样式跟 marketing 卡片走。
 */
type Props = (
  | { kind: 'subscription'; plan: 'pro' | 'max'; interval: 'monthly' | 'yearly' }
  | { kind: 'topup'; pack: 'small' | 'medium' | 'large' }
  | { kind: 'portal' }
) & {
  label: string;
  primary?: boolean;
};

export function BuyButton(props: Props) {
  const { label, primary } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const { endpoint, body } = resolveRequest(props);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; message?: string };
      if (!res.ok || !data.url) {
        setError(data.message || data.error || `请求失败（${res.status}）`);
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络错误');
      setBusy(false);
    }
  }

  const className = primary
    ? 'press inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-yellow px-4 py-2.5 text-[14px] font-bold text-ink disabled:opacity-50'
    : 'press-ink inline-flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-cream px-4 py-2.5 text-[14px] font-bold text-ink disabled:opacity-50';

  return (
    <div className="mt-6 flex w-full flex-col gap-2">
      <button type="button" disabled={busy} onClick={handleClick} className={className}>
        {busy ? '跳转中…' : label}
        {!busy && <ArrowUpRight />}
      </button>
      {error && <p className="text-center text-[12px] leading-tight text-amber">{error}</p>}
    </div>
  );
}

function resolveRequest(props: Props): { endpoint: string; body: unknown } {
  switch (props.kind) {
    case 'subscription':
      return { endpoint: '/api/checkout', body: { plan: props.plan, interval: props.interval } };
    case 'topup':
      return { endpoint: '/api/topup', body: { pack: props.pack } };
    case 'portal':
      return { endpoint: '/api/billing/portal', body: {} };
  }
}
