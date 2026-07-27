import type { CSSProperties, ReactNode } from 'react';

import baseStyles from './template-base.module.css';
import TemplateFonts from './template-fonts';

export type TemplatePageProps = {
  /** 模板根 className（来自 templates.module.css 的 styles.tN）。
   *  noUncheckedIndexedAccess 让 styles 读出来是 `string | undefined`，所以这里也允许 undefined。 */
  className: string | undefined;
  /** 可选的强制主色，覆盖 CSS module 默认的 --accent。注意 exactOptionalPropertyTypes：
   *  这里写成 `string | undefined` 而不是 `accent?`，让调用方能直接 `accent={maybeUndefined}`。 */
  accent: string | undefined;
  children: ReactNode;
};

/**
 * 模板外层壳：注入 A4 尺寸 + 字体。
 *
 * 跟 default 模板的 layout.tsx 平级使用——layout.module.css 把背景刷成纯白；
 * 这里 .page 再叠 794×1123 真实 A4 尺寸 + reset 元素样式。
 */
export function TemplatePage({ className, accent, children }: TemplatePageProps) {
  const style: CSSProperties | undefined = accent ? ({ ['--accent' as string]: accent } as CSSProperties) : undefined;
  return (
    <>
      <TemplateFonts />
      <article className={`${baseStyles.page} ${className}`} style={style}>
        {children}
      </article>
    </>
  );
}
