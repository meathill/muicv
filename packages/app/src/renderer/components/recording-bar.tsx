import { Button } from '@muicv/ui';
import type { ReactElement } from 'react';

import type { RecorderPhase } from '../lib/use-recorder';
import { RECORDER_AUTO_STOP_SILENCE_MS } from '../lib/use-recorder';

type Props = {
  phase: RecorderPhase;
  elapsedMs: number;
  limitSec: number;
  rms: number;
  errorMsg: string;
  onCancel: () => void;
  onFinish: () => void;
};

/**
 * 内嵌在 chat-input-bar 输入条位置的录音条：替换原本的 [mic/paperclip/textarea/send] 整行。
 *
 * 比起原来的全屏 dialog，关键差别是 AI 上一条消息保持可见——这是 issue 描述的核心诉求。
 */
export function RecordingBar({ phase, elapsedMs, limitSec, rms, errorMsg, onCancel, onFinish }: Props): ReactElement {
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const remainSec = Math.max(0, limitSec - elapsedSec);
  const canFinish = phase === 'recording';
  const isError = phase === 'error';
  // RMS 一般在 0–0.2 区间，× 500 把可视范围拉满
  const wavePercent = Math.min(100, rms * 500);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border-2 bg-cream p-2 transition ${
        isError ? 'border-tongue/60' : 'border-rule-strong'
      }`}
    >
      <div className="flex shrink-0 items-center justify-center px-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${isError ? 'bg-tongue' : 'animate-pulse bg-tongue'}`}
          aria-hidden
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-paper" aria-hidden>
          <div
            className={`h-full transition-all duration-100 ${canFinish ? 'bg-yellow' : 'bg-rule'}`}
            style={{ width: `${wavePercent}%` }}
          />
        </div>
        <div className="text-[12px] leading-tight text-mute" aria-live="polite">
          {phase === 'preparing' && '准备录音…'}
          {phase === 'recording' && (
            <>
              已录 {formatTime(elapsedMs)} / {formatTime(limitSec * 1000)} · 静音{' '}
              {Math.round(RECORDER_AUTO_STOP_SILENCE_MS / 1000)}s 自动停 · 剩余 {remainSec}s
            </>
          )}
          {phase === 'finishing' && '正在保存…'}
          {phase === 'error' && <span className="text-tongue">{errorMsg || '录音失败'}</span>}
        </div>
      </div>
      <Button onClick={onCancel} variant="press-ink">
        取消
      </Button>
      <Button onClick={onFinish} disabled={!canFinish} variant="press">
        完成
      </Button>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
