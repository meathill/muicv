import { Button } from '@muicv/ui';
import { CloudArrowDownIcon, MicrophoneIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import type {
  SttPreference,
  WhisperEngineStatus,
  WhisperModelName,
  WhisperProgressEvent,
} from '../../../shared/types.ts';

/**
 * 本地转写引擎插件卡（issue #1 M3）。
 *
 * 状态：未装 → 一键下载（约 12 MB whisper.cpp 二进制 + 用户选模型）
 * 已装 → 显示版本 + 模型清单 + 偏好（cloud / local-preferred / always-ask）
 *
 * 引擎来自 muicv 自家 GitHub Release（已 Developer ID 签名 + Apple notarized）；
 * 模型来自 HuggingFace ggerganov/whisper.cpp。
 */

const ENGINE_VERSION = '1.0.0';

const PREFERENCE_OPTIONS: Array<{ id: SttPreference; label: string; hint: string }> = [
  { id: 'cloud', label: '云端', hint: '默认。Cloudflare Workers AI Whisper，按音频时长扣 token。' },
  {
    id: 'local-preferred',
    label: '本地优先',
    hint: '装好引擎 + 默认模型才走本地 whisper.cpp（离线 / 隐私 / 免 token）；缺装件时自动回退云端。',
  },
];

const MODEL_OPTIONS: Array<{ id: WhisperModelName; label: string; hint: string }> = [
  { id: 'base', label: 'base（~140 MB）', hint: '入门级，CPU 跑得飞快' },
  { id: 'small', label: 'small（~470 MB）', hint: '中英文准确率高，推荐' },
];

export function WhisperEngineCard() {
  const [status, setStatus] = useState<WhisperEngineStatus | null>(null);
  const [busy, setBusy] = useState<{ kind: 'engine' | 'model'; target: string } | null>(null);
  const [progress, setProgress] = useState<WhisperProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.muicv.whisperEngine.status().then(setStatus);
    const unsub = window.muicv.whisperEngine.onProgress(setProgress);
    return unsub;
  }, []);

  async function withBusy<T>(kind: 'engine' | 'model', target: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy({ kind, target });
    setProgress(null);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onInstallEngine() {
    const result = await withBusy('engine', ENGINE_VERSION, () =>
      window.muicv.whisperEngine.installEngine(ENGINE_VERSION),
    );
    if (result?.ok) setStatus(result.status);
    else if (result && !result.ok) setError(result.message);
  }

  async function onUninstallEngine() {
    const next = await withBusy('engine', ENGINE_VERSION, () => window.muicv.whisperEngine.uninstallAll());
    if (next) setStatus(next);
  }

  async function onInstallModel(name: WhisperModelName) {
    const result = await withBusy('model', name, () => window.muicv.whisperEngine.installModel(name));
    if (result?.ok) setStatus(result.status);
    else if (result && !result.ok) setError(result.message);
  }

  async function onUninstallModel(name: WhisperModelName) {
    const next = await withBusy('model', name, () => window.muicv.whisperEngine.uninstallModel(name));
    if (next) setStatus(next);
  }

  async function onChangePref(pref: SttPreference) {
    const next = await window.muicv.whisperEngine.setPreference(pref);
    setStatus(next);
  }

  async function onChangeDefault(name: WhisperModelName) {
    const next = await window.muicv.whisperEngine.setDefaultModel(name);
    setStatus(next);
  }

  if (!status) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-5 text-[12px] text-mute">读取插件状态…</section>
    );
  }

  const engineInstalled = status.engine.installed;

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fluff text-yellow-deep">
          <MicrophoneIcon size={18} weight="duotone" />
        </div>
        <div className="flex-1">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">语音转写</p>
          <h3 className="mt-1 text-[14px] font-bold text-ink">本地引擎（whisper.cpp）</h3>
          <p className="mt-1 text-[12px] leading-[1.6] text-mute">
            按需下载 ~12 MB 引擎 + 一个模型，转写就走本地 — 离线 / 隐私 / 不扣 token。不下也行，默认走云端。
          </p>
        </div>
      </div>

      {error && (
        <pre className="mt-3 max-h-48 select-text overflow-auto whitespace-pre-wrap rounded-md border border-tongue/40 bg-tongue/10 px-3 py-2 font-mono text-[12px] leading-relaxed text-tongue">
          {error}
        </pre>
      )}

      {/* 引擎本体 */}
      <div className="mt-4 rounded-xl border-2 border-rule-strong bg-paper p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-ink">whisper.cpp 引擎</p>
            <p className="mt-0.5 text-[12px] text-mute">
              {engineInstalled ? `已安装 v${status.engine.version ?? '?'}` : '未安装（约 12 MB）'}
            </p>
          </div>
          {engineInstalled ? (
            <Button
              onClick={() => void onUninstallEngine()}
              disabled={busy != null}
              variant="outline"
              size="xs"
              className="border-2 border-rule-strong font-bold hover:bg-fluff"
            >
              卸载
            </Button>
          ) : (
            <DownloadButton
              busy={busy?.kind === 'engine'}
              onClick={onInstallEngine}
              disabled={busy != null}
              label="下载引擎"
            />
          )}
        </div>
        {busy?.kind === 'engine' && progress && <ProgressBar event={progress} />}
      </div>

      {/* 模型 */}
      {engineInstalled && (
        <div className="mt-3 rounded-xl border-2 border-rule-strong bg-paper p-3">
          <p className="text-[14px] font-bold text-ink">模型</p>
          <p className="mt-0.5 text-[12px] text-mute">
            至少装一个模型才能跑本地。HuggingFace 直接下载，不扣 token。
            <br />
            <span className="text-mute/80">
              注：whisper 上游命名按从小到大是 base &lt; small &lt; medium，命名 OpenAI 定的，反直觉。
            </span>
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {MODEL_OPTIONS.map((opt) => {
              const m = status.models.find((x) => x.name === opt.id);
              const installed = m?.installed ?? false;
              const isDefault = status.defaultModel === opt.id;
              const isBusyHere = busy?.kind === 'model' && busy?.target === opt.id;
              return (
                <div key={opt.id} className="rounded-lg border border-rule px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-ink">
                        {opt.label}{' '}
                        {isDefault && installed && (
                          <span className="ml-1 rounded bg-fluff px-1.5 py-0.5 text-[12px] text-yellow-deep">默认</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[12px] text-mute">{opt.hint}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {installed ? (
                        <>
                          {!isDefault && (
                            <Button
                              onClick={() => void onChangeDefault(opt.id)}
                              variant="outline"
                              size="xs"
                              className="border-2 border-rule-strong font-bold hover:bg-fluff"
                            >
                              设为默认
                            </Button>
                          )}
                          <Button
                            onClick={() => void onUninstallModel(opt.id)}
                            disabled={busy != null}
                            variant="outline"
                            size="xs"
                            className="border-2 border-rule-strong font-bold hover:bg-fluff"
                          >
                            卸载
                          </Button>
                        </>
                      ) : (
                        <DownloadButton
                          busy={isBusyHere}
                          onClick={() => void onInstallModel(opt.id)}
                          disabled={busy != null}
                          label="下载"
                          compact
                        />
                      )}
                    </div>
                  </div>
                  {isBusyHere && progress && <ProgressBar event={progress} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 偏好 */}
      <div className="mt-3 rounded-xl border-2 border-rule-strong bg-paper p-3">
        <p className="text-[14px] font-bold text-ink">转写策略</p>
        <div className="mt-2 flex flex-col gap-2">
          {PREFERENCE_OPTIONS.map((opt) => {
            const selected = status.preference === opt.id;
            const localReady = engineInstalled && status.models.some((m) => m.installed);
            const disabled = opt.id === 'local-preferred' && !localReady;
            return (
              <Button
                key={opt.id}
                onClick={() => {
                  if (!disabled) void onChangePref(opt.id);
                }}
                disabled={disabled}
                title={disabled ? '先下载引擎和至少一个模型' : ''}
                variant="outline"
                className={`h-auto items-start gap-3 py-2 text-left font-normal whitespace-normal transition sm:h-auto ${
                  selected
                    ? 'border-ink bg-fluff shadow-[0_2px_0_0_var(--color-ink)]'
                    : 'border-rule-strong enabled:hover:bg-paper'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-ink">
                    {opt.label}
                    {disabled && <span className="ml-2 text-[12px] font-normal text-mute">需先装引擎和模型</span>}
                  </p>
                  <p className="mt-0.5 text-[12px] text-mute">{opt.hint}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DownloadButton({
  busy,
  onClick,
  disabled,
  label,
  compact,
}: {
  busy: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
  compact?: boolean;
}) {
  const iconSize = compact ? 12 : 13;
  return (
    <Button onClick={onClick} disabled={disabled} variant="press" size="xs" className={compact ? undefined : 'px-3'}>
      {busy ? (
        <>
          <SpinnerGapIcon size={iconSize} weight="bold" className="animate-spin" />
          下载中
        </>
      ) : (
        <>
          <CloudArrowDownIcon size={iconSize} weight="bold" />
          {label}
        </>
      )}
    </Button>
  );
}

function ProgressBar({ event }: { event: WhisperProgressEvent }) {
  const pct = Math.round(event.event.fraction * 100);
  const phaseLabel: Record<WhisperProgressEvent['event']['phase'], string> = {
    download: `下载中 ${pct}%`,
    extract: '解压中…',
    verify: '校验中…',
    done: '完成',
  };
  const received = event.event.receivedBytes;
  const total = event.event.totalBytes;
  return (
    <div className="mt-2">
      <div className="h-2 w-full overflow-hidden rounded-full border border-rule bg-cream">
        <div className="h-full bg-yellow transition-all duration-150" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-1 text-[12px] text-mute">
        {phaseLabel[event.event.phase]}
        {received != null && total != null && (
          <span className="ml-2 font-mono">
            {(received / 1024 / 1024).toFixed(1)} / {(total / 1024 / 1024).toFixed(1)} MB
          </span>
        )}
      </p>
    </div>
  );
}
