import { CpuIcon } from '@phosphor-icons/react';
import {
  type ReasoningEffort,
  LLM_DISPLAY_META,
  modelSupportsReasoningEffort,
  REASONING_EFFORTS,
  SUPPORTED_LLM_MODELS,
} from '@muicv/shared';

import { useAppStore } from '../../lib/store';

const EFFORT_LABELS: Record<ReasoningEffort, string> = {
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
};

const VENDOR_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  'opencode-go': 'OpenCode Go',
  xiaomi: 'Xiaomi',
};

export function ModelCard({ isBYOK, currentModel }: { isBYOK: boolean; currentModel: string }) {
  const patch = useAppStore((s) => s.patchConfig);
  const effort = useAppStore((s) => s.config.llmReasoningEffort);

  if (isBYOK) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fluff text-yellow-deep">
            <CpuIcon size={18} weight="duotone" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">模型</p>
            <h3 className="mt-1 text-[14px] font-bold text-ink">正在用你自己的 endpoint</h3>
            <p className="mt-1 text-[12px] leading-[1.6] text-mute">
              已配置自带 OpenAI 兼容 endpoint，平台模型清单不生效。下方“用我自己的模型和额度”里改默认模型名。
            </p>
            <p className="mt-1.5 font-mono text-[12px] text-ink-soft">当前模型：{currentModel}</p>
          </div>
        </div>
      </section>
    );
  }

  const canTuneEffort = modelSupportsReasoningEffort(currentModel);
  const activeMeta = LLM_DISPLAY_META[currentModel];

  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">模型</p>
      <h3 className="mt-1 text-[14px] font-bold text-ink">选默认模型</h3>
      <p className="mt-1 text-[12px] leading-[1.6] text-mute">
        所有对话用这个 model 调 LLM。token 价按上游差异不一样，按需切换；切了立刻生效。
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {SUPPORTED_LLM_MODELS.map((id) => {
          const meta = LLM_DISPLAY_META[id];
          if (!meta) return null;
          const selected = currentModel === id;
          return (
            <button
              type="button"
              key={id}
              onClick={() => void patch({ defaultModel: id })}
              className={`flex items-start gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition ${
                selected
                  ? 'border-ink bg-fluff shadow-[0_3px_0_0_var(--color-ink)]'
                  : 'border-rule-strong bg-cream hover:bg-paper'
              }`}
            >
              <span
                className={`mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-ink bg-yellow' : 'border-rule-strong bg-cream'
                }`}
              >
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[14px] font-bold text-ink">{meta.label}</span>
                  {meta.isDefault && (
                    <span className="rounded-md bg-yellow px-1.5 py-0.5 font-mono text-[12px] font-bold uppercase tracking-wider text-ink">
                      默认
                    </span>
                  )}
                  {!meta.supportsToolCalls && (
                    <span
                      className="rounded-md border border-tongue/60 bg-tongue/10 px-1.5 py-0.5 font-mono text-[12px] font-bold uppercase tracking-wider text-tongue"
                      title="thinking-mode 推理模型，muicv agent 流程（多轮工具调用）不兼容；简单单轮对话可用"
                    >
                      ⚠ 不支持 agent
                    </span>
                  )}
                  <span className="font-mono text-[12px] uppercase tracking-wider text-mute">
                    {VENDOR_LABELS[meta.vendor]}
                  </span>
                  <span className="text-[12px] text-ink-soft">· {meta.hint}</span>
                </span>
                <span className="mt-1 block font-mono text-[12px] text-mute">
                  输入 {meta.inputPrice} · 输出 {meta.outputPrice}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {canTuneEffort && (
        <div className="mt-3 rounded-lg border border-rule bg-paper px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-bold text-ink">推理力度</p>
            <div className="flex gap-1">
              {REASONING_EFFORTS.map((value) => {
                const active = effort === value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => void patch({ llmReasoningEffort: value })}
                    className={`rounded-md border-2 px-2.5 py-1 text-[12px] font-bold transition ${
                      active
                        ? 'border-ink bg-yellow text-ink shadow-[0_2px_0_0_var(--color-ink)]'
                        : 'border-transparent bg-cream text-mute hover:text-ink'
                    }`}
                  >
                    {EFFORT_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-mute">
            越高想得越深，但更慢也更费 token。当前作用于 {activeMeta?.label ?? currentModel}。
          </p>
        </div>
      )}
    </section>
  );
}
