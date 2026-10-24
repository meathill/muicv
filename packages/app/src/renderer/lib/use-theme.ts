import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'muicv-theme';

export function readStoredTheme(): Theme {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'auto') return v;
  } catch {
    // ignore
  }
  return 'light';
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === 'light') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', t);
  }
}

/** 同步应用主题，提供给 main.tsx 在 createRoot 之前调用，避免首帧闪光。 */
export function bootstrapTheme(): void {
  applyTheme(readStoredTheme());
}

/** 三态主题切换：light / auto / dark。data-theme 联动在 globals.css 里。 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  // 首挂 sync DOM（main.tsx 已经做了，但保险）
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore quota / private-mode errors
    }
    applyTheme(t);
  }

  return { theme, setTheme };
}
