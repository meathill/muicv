import { Fraunces, JetBrains_Mono, Nunito } from 'next/font/google';

// 双 root layout（(zh)/(en)）共用同一份字体配置，避免各自定义导致加载分裂。

// Display serif: Fraunces 是 variable font，opsz/SOFT 轴帮我们实现优雅 italic
export const fontDisplay = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'opsz'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: false,
});

// Body sans: Nunito，圆润 friendly，配柯基卡通气质
export const fontSans = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
});

// Mono：仅终端 / 代码块用
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});
