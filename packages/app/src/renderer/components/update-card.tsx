import { ArrowCircleUpIcon, ArrowsClockwiseIcon, DownloadSimpleIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { useAppStore } from '../lib/store';
import { toast } from '../lib/toast';
import { formatUpdaterError } from '../lib/updater-utils';

/**
 * 左下侧栏的「软件更新」卡片：
 *
 *   - dev 模式（status.skipped）整体不渲染
 *   - idle / 已是最新版：不渲染，避免常驻打扰
 *   - checking：「正在检查更新…」+ 旋转图标
 *   - downloading：「下载新版本 vX.Y.Z」+ 进度条 + transferred/total
 *   - ready：高亮「v X.Y.Z 已就绪」+「立即重启」+「稍后」（折叠为缩略一行）
 *   - error：轻量人话提示（8秒自动淡出，可手动关闭），同时伴随全局 Toast 提醒
 */
export function UpdateCard() {
  const status = useAppStore((s) => s.updaterStatus);
  const setStatus = useAppStore((s) => s.setUpdaterStatus);
  const [readyDismissed, setReadyDismissed] = useState(false);

  // 重新进入 ready 状态时自动展开（用户先稍后、又下了一次新版本的场景）。
  useEffect(() => {
    if (status.phase === 'ready') setReadyDismissed(false);
  }, [status.phase]);

  // 发生错误时触发 Toast 提醒，并在 8 秒后自动收敛回 idle，避免在侧边栏常驻占用空间
  useEffect(() => {
    if (status.phase === 'error') {
      toast.warning(formatUpdaterError(status.message), '软件更新');
      const timer = setTimeout(() => {
        setStatus({ phase: 'idle' });
      }, 8_000);
      return () => clearTimeout(timer);
    }
  }, [status.phase, status.message, setStatus]);

  if (status.skipped || status.phase === 'idle') return null;

  async function handleCheck() {
    const next = await window.muicv.updater.checkNow();
    setStatus(next);
  }

  async function handleInstall() {
    await window.muicv.updater.quitAndInstall();
  }

  if (status.phase === 'ready' && readyDismissed) {
    return (
      <>
        <div className="h-px bg-rule" />
        <button
          type="button"
          onClick={() => setReadyDismissed(false)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[12px] font-medium text-yellow-deep hover:bg-fluff/60"
        >
          <ArrowCircleUpIcon size={13} weight="fill" />
          <span className="truncate">v{status.version} 已就绪 · 点此重启</span>
        </button>
      </>
    );
  }

  return (
    <>
      <div className="h-px bg-rule" />
      <div className="px-3 py-2.5">{renderBody()}</div>
    </>
  );

  function renderBody() {
    switch (status.phase) {
      case 'checking':
        return (
          <div className="flex items-center gap-1.5 text-[12px] text-mute">
            <ArrowsClockwiseIcon size={12} className="animate-spin" />
            <span>正在检查更新…</span>
          </div>
        );

      case 'downloading': {
        const percent = Math.max(0, Math.min(100, Math.round(status.percent ?? 0)));
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <DownloadSimpleIcon size={12} weight="bold" />
              <span className="truncate">下载新版本 v{status.version ?? '?'}</span>
              <span className="ml-auto font-mono text-[12px] tabular-nums text-mute">{percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full border border-rule-strong bg-cream">
              <div className="h-full bg-yellow transition-[width] duration-150" style={{ width: `${percent}%` }} />
            </div>
            {typeof status.totalBytes === 'number' && status.totalBytes > 0 ? (
              <span className="font-mono text-[12px] tabular-nums text-mute">
                {formatBytes(status.transferredBytes ?? 0)} / {formatBytes(status.totalBytes)}
              </span>
            ) : null}
          </div>
        );
      }

      case 'ready':
        return (
          <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-yellow/30 p-2 shadow-[0_3px_0_0_var(--color-ink)]">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <ArrowCircleUpIcon size={13} weight="fill" />
              <span className="truncate">v{status.version} 已就绪</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleInstall()}
                className="press flex-1 rounded-md bg-yellow px-2 py-1 text-[12px] font-bold text-ink"
              >
                立即重启
              </button>
              <button
                type="button"
                onClick={() => setReadyDismissed(true)}
                className="rounded-md border-2 border-rule-strong bg-cream px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-fluff"
              >
                稍后
              </button>
            </div>
          </div>
        );

      case 'error': {
        const friendlyMsg = formatUpdaterError(status.message);
        return (
          <div className="flex flex-col gap-1.5 rounded-md border border-rule-strong bg-cream/70 p-2">
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-start gap-1.5 text-[12px] text-ink-soft min-w-0">
                <WarningIcon size={13} weight="fill" className="mt-0.5 shrink-0 text-warning" />
                <span className="break-words font-medium">{friendlyMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatus({ phase: 'idle' })}
                className="shrink-0 text-mute hover:text-ink p-0.5"
                title="忽略"
              >
                <XIcon size={12} weight="bold" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={() => void handleCheck()}
                className="rounded border border-rule-strong bg-cream px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-fluff"
              >
                重试
              </button>
              <button
                type="button"
                onClick={() => setStatus({ phase: 'idle' })}
                className="text-[11px] text-mute hover:text-ink"
              >
                忽略
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
