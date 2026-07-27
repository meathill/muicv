'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * 给指定用户赠予 token 的表单。
 *
 * - amount：显示 token 正整数，前端硬限制 1..1_000_000（与后端一致）
 * - reason：必填，至少 5 字
 *
 * 提交成功后 router.refresh() 让详情页拉取最新余额和流水；自身展示「已赠送 +N」短暂反馈。
 */
const MAX_AMOUNT = 1_000_000;

export function GrantForm({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const n = Number.parseInt(amount, 10);
    if (!Number.isInteger(n) || n <= 0) {
      setError('amount 必须是正整数');
      return;
    }
    if (n > MAX_AMOUNT) {
      setError(`单次赠予不能超过 ${MAX_AMOUNT.toLocaleString()} tokens`);
      return;
    }
    if (reason.trim().length < 5) {
      setError('reason 至少 5 字');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, amount: n, reason: reason.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        balance?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.message || data.error || `请求失败（${res.status}）`);
        setBusy(false);
        return;
      }
      setSuccess(
        `已赠送 +${n.toLocaleString()} tokens 给 ${userEmail}（当前余额 ${(data.balance ?? 0).toLocaleString()}）`,
      );
      setAmount('');
      setReason('');
      setBusy(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="text-[14px] font-bold text-ink">
          赠予数量（显示 token）
          <input
            type="number"
            min={1}
            max={MAX_AMOUNT}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如 1000"
            disabled={busy}
            className="mt-1 w-full rounded-lg border-2 border-rule bg-cream px-3 py-2 font-mono text-[14px] tabular-nums text-ink focus:border-ink focus:outline-none disabled:opacity-60"
          />
        </label>
        <label className="text-[14px] font-bold text-ink">
          原因（≥5 字，会写入流水审计）
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例如：补偿 2026-05-01 PDF 渲染失败"
            rows={2}
            disabled={busy}
            className="mt-1 w-full rounded-lg border-2 border-rule bg-cream px-3 py-2 text-[14px] text-ink focus:border-ink focus:outline-none disabled:opacity-60"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="press-ink rounded-xl border-2 border-ink bg-yellow px-4 py-2 text-[14px] font-bold text-ink disabled:opacity-50"
        >
          {busy ? '赠送中…' : '确认赠送'}
        </button>
        {error && <span className="text-[12px] text-amber">{error}</span>}
        {success && <span className="text-[12px] text-yellow-deep">{success}</span>}
      </div>
    </form>
  );
}
