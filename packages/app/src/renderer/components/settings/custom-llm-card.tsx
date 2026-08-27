import { CheckIcon } from '@phosphor-icons/react';
import { DEFAULT_LLM_MODEL, SUPPORTED_LLM_MODELS } from '@muicv/shared';
import { useEffect, useState } from 'react';

import { useAppStore } from '../../lib/store';

export function CustomLlmCard() {
  const cfg = useAppStore((s) => s.config);
  const patch = useAppStore((s) => s.patchConfig);

  const [defaultModel, setDefaultModel] = useState(cfg.defaultModel);
  const [customLlmBase, setCustomLlmBase] = useState(cfg.customLlmBase ?? '');
  const [customLlmKey, setCustomLlmKey] = useState(cfg.customLlmKey ?? '');
  const [muicvApiBase, setMuicvApiBase] = useState(cfg.muicvApiBase);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDefaultModel(cfg.defaultModel);
    setCustomLlmBase(cfg.customLlmBase ?? '');
    setCustomLlmKey(cfg.customLlmKey ?? '');
    setMuicvApiBase(cfg.muicvApiBase);
  }, [cfg.defaultModel, cfg.customLlmBase, cfg.customLlmKey, cfg.muicvApiBase]);

  const customConfigured = !!(cfg.customLlmBase && cfg.customLlmKey);

  async function onSave() {
    await patch({
      defaultModel: defaultModel.trim() || DEFAULT_LLM_MODEL,
      customLlmBase: customLlmBase.trim() || null,
      customLlmKey: customLlmKey.trim() || null,
      muicvApiBase: muicvApiBase.trim() || 'https://api.muicv.com',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function onClearCustom() {
    setCustomLlmBase('');
    setCustomLlmKey('');
    await patch({ customLlmBase: null, customLlmKey: null });
  }

  return (
    <details className="rounded-xl border-2 border-rule bg-paper" open={customConfigured}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
        <div>
          <p className="text-[14px] font-bold text-ink-soft">自带 endpoint / API key</p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-mute">
            {customConfigured ? (
              <>
                <CheckIcon size={11} weight="bold" className="shrink-0" />
                <span>当前直连 {shortHost(cfg.customLlmBase ?? '')}（不走 muicv 平台）</span>
              </>
            ) : (
              <span>你也可以使用其它平台的 OpenAI 兼容 endpoint，减少 MuiCV token 消耗。</span>
            )}
          </p>
        </div>
        <span className="text-[12px] text-mute">展开 ↓</span>
      </summary>

      <div className="space-y-4 border-t border-rule px-5 py-4">
        <p className="text-[12px] leading-[1.65] text-mute">
          有自己的 OpenAI 兼容 endpoint 和 API key？填在下面，AI 调用会直接打你配的端点，不再经过 muicv 平台。支持
          OpenAI、muirouter、自部署的 ollama / vllm 等。
        </p>

        <Field
          label="API endpoint URL"
          hint="OpenAI 兼容的 base URL；留空 = 走 muicv 平台"
          value={customLlmBase}
          onChange={setCustomLlmBase}
          placeholder="https://api.openai.com/v1"
          mono
        />
        <Field
          label="API key"
          hint="跟上面那个 endpoint 配套；只存本地（Keychain 加密）"
          value={customLlmKey}
          onChange={setCustomLlmKey}
          placeholder="sk-... / 留空 = 不直连"
          mono
          password
        />
        <Field
          label="默认模型"
          hint={`走 muicv 平台支持：${SUPPORTED_LLM_MODELS.join(' / ')}（以平台最新清单为准）。自带 endpoint 时按你的清单填。`}
          value={defaultModel}
          onChange={setDefaultModel}
          placeholder={DEFAULT_LLM_MODEL}
          mono
        />

        <details className="rounded-lg border border-rule bg-cream px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-medium text-mute">高级 · muicv API base URL</summary>
          <div className="mt-2.5 space-y-2">
            <p className="text-[12px] text-mute">
              改错了 app 跑不起来。本地 dev wrangler 时指向 http://localhost:8787。
            </p>
            <Field label="" value={muicvApiBase} onChange={setMuicvApiBase} placeholder="https://api.muicv.com" mono />
          </div>
        </details>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => void onSave()}
            className="press inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow px-4 py-2 text-[14px] font-bold text-ink"
          >
            {saved ? (
              <>
                <CheckIcon size={13} weight="bold" />
                <span>已保存</span>
              </>
            ) : (
              <span>保存</span>
            )}
          </button>
          {customConfigured && (
            <button
              type="button"
              onClick={() => void onClearCustom()}
              className="rounded-lg border-2 border-rule-strong bg-cream px-3.5 py-2 text-[12px] font-medium text-mute hover:text-ink"
            >
              清掉自带配置（恢复走 muicv 平台）
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  mono,
  password,
}: {
  label: string;
  hint?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  password?: boolean;
}) {
  return (
    <label className="block">
      {label && <span className="block text-[14px] font-bold text-ink">{label}</span>}
      {hint && <span className="mt-0.5 block text-[12px] text-mute">{hint}</span>}
      <input
        type={password ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`mt-1.5 block w-full rounded-lg border-2 border-rule-strong bg-cream px-3.5 py-2.5 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:bg-fluff focus:outline-none focus:ring-4 focus:ring-yellow/40 ${mono ? 'font-mono text-[14px]' : ''}`}
      />
    </label>
  );
}

function shortHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
