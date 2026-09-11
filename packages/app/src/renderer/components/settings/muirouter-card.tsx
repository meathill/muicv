import { formatCents } from '@muicv/shared';
import { ArrowClockwiseIcon, WalletIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import type { MuirouterInfo } from '../../../shared/types';
import { DASHBOARD_URL, ExternalButton, MUIROUTER_URL } from './bits';

export function MuirouterCard({
  hasBYOK,
  muirouter,
  onRefresh,
}: {
  hasBYOK: boolean;
  muirouter: MuirouterInfo | null;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLink() {
    setError(null);
    setBusy(true);
    try {
      const res = await window.muicv.session.beginLinkMuirouter();
      if (!res.ok) setError(res.message ?? '打开浏览器失败');
    } finally {
      setBusy(false);
    }
  }

  if (hasBYOK && muirouter) {
    return (
      <section className="rounded-xl border-2 border-corgi/60 bg-fluff p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream text-yellow-deep">
            <WalletIcon size={18} weight="duotone" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">muirouter（已关联）</p>
            <h3 className="mt-1 text-[16px] font-bold text-ink">
              余额：<span className="tabular-nums">{formatCents(muirouter.balanceCents, muirouter.currency)}</span>
            </h3>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] text-ink-soft">
              <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">账号</dt>
              <dd>{muirouter.email ?? '—'}</dd>
              <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">默认模型</dt>
              <dd>{muirouter.defaultModel}</dd>
              <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">余额更新</dt>
              <dd>{formatTimestamp(muirouter.balanceUpdatedAt)}</dd>
            </dl>
            <p className="mt-2 text-[12px] text-mute">
              muicv 平台余额优先；耗尽后自动走 muirouter。模型切换和详细管理在网页 dashboard。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onRefresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rule-strong bg-cream px-3.5 py-1.5 text-[12px] font-bold text-ink-soft hover:bg-paper"
              >
                <ArrowClockwiseIcon size={12} weight="bold" />
                <span>同步状态</span>
              </button>
              <ExternalButton href={`${DASHBOARD_URL}/muirouter`} label="去 dashboard 管理 →" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border-2 border-rule bg-paper p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fluff text-yellow-deep">
          <WalletIcon size={18} weight="duotone" />
        </div>
        <div className="flex-1">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">关于 muirouter</p>
          <h3 className="mt-1 text-[16px] font-bold text-ink">muicv 余额耗尽？关联 muirouter，按需 fallback</h3>
          <p className="mt-1.5 text-[12px] leading-[1.65] text-ink-soft">
            muirouter 是一个独立的 AI 余额服务。在它那边充一笔，跨服务复用：muicv 平台余额扣完后自动走 muirouter，
            桌面端不掉链子。授权全程在 muirouter 完成，muicv 只保管 OAuth token（AES-GCM 加密）。
          </p>
          {error && <p className="mt-2 text-[12px] font-medium text-tongue">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onLink()}
              disabled={busy}
              className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-3.5 py-1.5 text-[12px] font-bold text-ink disabled:opacity-60"
            >
              {busy ? '正在打开浏览器…' : '关联 muirouter'}
            </button>
            <ExternalButton href={MUIROUTER_URL} label="先去 muirouter 看看" />
          </div>
        </div>
      </div>
    </section>
  );
}

// 本地用：把 ms 时间戳格式化为「xx 时间」。用 toLocaleString 是因为 Electron renderer
// 没有 SSR hydration 担心，可以走系统语言；website SSR 那边各自硬格式化避免 mismatch。
function formatTimestamp(ms: number | null | undefined): string {
  if (typeof ms !== 'number') return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}
