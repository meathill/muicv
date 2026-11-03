import { MoonIcon, SunIcon } from '@phosphor-icons/react';

import { type Theme, useTheme } from '../../lib/use-theme';

const OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: 'light', label: '浅色', hint: '默认（奶油白底）' },
  { value: 'auto', label: '自动', hint: '跟随系统' },
  { value: 'dark', label: '暗色', hint: '暖深棕底' },
];

/**
 * Settings 里的主题切换卡片。
 * 三档：light / auto / dark；当前档位走 yellow press 阴影。
 */
export function ThemeCard() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="rounded-xl border-2 border-rule bg-paper p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-extrabold text-ink">主题</p>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">UI Theme</p>
      </div>
      <p className="mt-1 text-[12px] text-ink-soft">浅色稳定，暗色还在调，先体验。</p>
      <div role="radiogroup" aria-label="主题" className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            // 保留原生 button：这是双行 flex-col 的选择瓦片（role="radio"），与 Button 基础样式
            // （固定高度 h-9、nowrap、justify-center、svg 尺寸覆写）冲突，迁移需全量覆写才能等价，得不偿失。
            // biome-ignore lint/a11y/useSemanticElements: 三态主题的分段选择器，样式定制不走原生 radio
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={
                active
                  ? 'inline-flex flex-col items-start gap-1 rounded-md border-2 border-ink bg-yellow px-3 py-2 text-left shadow-[0_2px_0_0_var(--color-yellow-shadow)]'
                  : 'inline-flex flex-col items-start gap-1 rounded-md border-2 border-rule bg-cream px-3 py-2 text-left transition-colors hover:border-corgi'
              }
            >
              <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-ink">
                {opt.value === 'light' && <SunIcon size={14} weight={active ? 'fill' : 'regular'} />}
                {opt.value === 'dark' && <MoonIcon size={14} weight={active ? 'fill' : 'regular'} />}
                {opt.label}
              </span>
              <span className={`text-[12px] ${active ? 'text-ink-soft' : 'text-mute'}`}>{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
