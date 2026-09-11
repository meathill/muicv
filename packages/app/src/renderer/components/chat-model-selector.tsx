import { Popover } from '@base-ui/react/popover';
import {
  LLM_DISPLAY_META,
  normalizeModel,
  REASONING_EFFORTS,
  type ReasoningEffort,
  SUPPORTED_LLM_MODELS,
} from '@muicv/shared';
import { CaretDownIcon, CheckIcon, CpuIcon, GearIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { useAppStore } from '../lib/store';

const EFFORT_LABELS: Record<ReasoningEffort, string> = {
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
};

type Props = {
  onOpenSettings?: (() => void) | undefined;
};

/**
 * 底部输入框的模型选择下拉菜单：
 * 模仿 Antigravity 设计，展示当前模型（及思考深度），
 * 点击弹出清晰的 Popover 列表供快速切换模型与推理深度。
 */
export function ChatModelSelector({ onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const defaultModel = useAppStore((s) => s.config.defaultModel);
  const effort = useAppStore((s) => s.config.llmReasoningEffort);
  const customLlmBase = useAppStore((s) => s.config.customLlmBase);
  const customLlmKey = useAppStore((s) => s.config.customLlmKey);
  const patchConfig = useAppStore((s) => s.patchConfig);
  const setView = useAppStore((s) => s.setView);

  const isBYOK = Boolean(customLlmKey && customLlmBase);
  const currentModel = normalizeModel(defaultModel);
  const activeMeta = LLM_DISPLAY_META[currentModel];

  // 触发器文案展示
  let triggerLabel = activeMeta?.label ?? currentModel;
  if (isBYOK) {
    triggerLabel = `自定义 · ${currentModel}`;
  } else if (activeMeta?.supportsReasoningEffort) {
    triggerLabel = `${activeMeta.label} ${EFFORT_LABELS[effort] ?? '高'}`;
  }

  function handleSelectModel(modelId: string) {
    void patchConfig({ defaultModel: modelId });
    const targetMeta = LLM_DISPLAY_META[modelId];
    // 若不是可调深度的模型，选完直接关闭；可调深度的可以留着供用户选思考深度
    if (!targetMeta?.supportsReasoningEffort) {
      setOpen(false);
    }
  }

  function handleSelectEffort(value: ReasoningEffort) {
    void patchConfig({ llmReasoningEffort: value });
    setOpen(false);
  }

  function handleGoSettings() {
    setOpen(false);
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setView('settings');
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        title="切换 AI 模型"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium text-ink-soft transition hover:bg-paper hover:text-ink cursor-pointer border border-transparent hover:border-rule focus:outline-none"
      >
        <span className="max-w-[160px] truncate">{triggerLabel}</span>
        <CaretDownIcon
          size={12}
          weight="bold"
          className={`text-mute transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="w-[320px] overflow-hidden rounded-xl border-2 border-rule-strong bg-cream shadow-xl focus:outline-none">
            <div className="flex items-center justify-between border-b border-rule px-3 py-2">
              <span className="text-[12px] font-bold text-ink">选择 AI 模型</span>
              <button
                type="button"
                onClick={handleGoSettings}
                className="inline-flex items-center gap-1 text-[12px] text-mute hover:text-ink transition cursor-pointer"
              >
                <GearIcon size={12} />
                <span>模型设置</span>
              </button>
            </div>

            {isBYOK && (
              <div className="border-b border-rule bg-paper/60 px-3 py-2 text-[12px] text-mute">
                <p className="font-semibold text-ink">当前使用自定义 Endpoint</p>
                <p className="mt-0.5 leading-normal">
                  已配置自带 API Key，以下平台列表暂不生效。如需切换平台模型，请在设置中清空自定义配置。
                </p>
              </div>
            )}

            <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-1">
              {SUPPORTED_LLM_MODELS.map((modelId) => {
                const meta = LLM_DISPLAY_META[modelId];
                if (!meta) return null;
                const isSelected = currentModel === modelId;

                return (
                  <button
                    type="button"
                    key={modelId}
                    onClick={() => handleSelectModel(modelId)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 rounded-lg p-2 text-left transition ${
                      isSelected
                        ? 'bg-fluff text-ink shadow-[0_1px_0_0_var(--color-rule)]'
                        : 'text-ink-soft hover:bg-paper hover:text-ink'
                    }`}
                  >
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <CheckIcon size={14} weight="bold" className="text-yellow-deep" />
                      ) : (
                        <CpuIcon size={14} weight="regular" className="text-mute/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-bold text-ink">{meta.label}</span>
                        {meta.isDefault && (
                          <span className="rounded bg-yellow/60 px-1 py-0.5 font-mono text-[10px] font-bold text-ink">
                            默认
                          </span>
                        )}
                        {meta.supportsAudioInput && (
                          <span className="rounded bg-corgi/40 px-1 py-0.5 font-mono text-[10px] font-bold text-ink">
                            语音
                          </span>
                        )}
                        {meta.supportsVision && (
                          <span className="rounded bg-paper-deep px-1 py-0.5 font-mono text-[10px] font-bold text-mute">
                            视觉
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-mute">{meta.hint}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-mute/70">
                        输入 {meta.inputPrice} · 输出 {meta.outputPrice}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeMeta?.supportsReasoningEffort && (
              <div className="border-t border-rule bg-paper/40 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-ink">思考深度</span>
                  <div className="flex gap-1">
                    {REASONING_EFFORTS.map((val) => {
                      const isActive = effort === val;
                      return (
                        <button
                          type="button"
                          key={val}
                          onClick={() => handleSelectEffort(val)}
                          className={`rounded-md px-2 py-0.5 text-[12px] font-bold transition cursor-pointer ${
                            isActive
                              ? 'border border-ink bg-yellow text-ink shadow-[0_1px_0_0_var(--color-ink)]'
                              : 'border border-transparent bg-cream text-mute hover:text-ink'
                          }`}
                        >
                          {EFFORT_LABELS[val]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
