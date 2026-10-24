/*
 * biome-ignore-all lint/suspicious/noArrayIndexKey: 流式 Markdown 按位置渲染，列表项/表格行/单元格以位置为身份
 */
/**
 * 极简 Markdown 渲染。
 *
 * 不引第三方依赖（package size + 安全审计成本）。覆盖简历内容的 90%：
 *   # / ## / ###    标题
 *   - / *           无序列表
 *   1. 2. 3.        有序列表
 *   **bold**        粗体
 *   *italic*        斜体（避开列表 *）
 *   `code`          行内代码（看起来像路径的会渲染成可点击 button）
 *   ```...```       代码块
 *   [text](url)     链接
 *   ---             水平线
 *   > quote         引用
 *   YAML frontmatter（--- ... ---）单独渲染成 metadata 表
 *   GFM 表格（首行 `|...|` + 分隔行 `|---|`）
 *
 * onPathClick：inline code 内容看起来像文件路径时（含 / 且有已知扩展名），
 * 渲染成可点击 button，点击触发 onPathClick(path)。容器层用事件委托捕获。
 *
 * 不支持：嵌套列表、HTML inline、图片。这些后续上 marked 再说。
 */

import { useCallback } from 'react';

import { type Align, type Block, inlineHtml, parse } from './markdown-parser.ts';

export { type Align, type Block, inlineHtml, parse };

export function MarkdownView({
  source,
  className,
  onPathClick,
}: {
  source: string;
  className?: string | undefined;
  onPathClick?: ((path: string) => void) | undefined;
}) {
  const blocks = parse(source);

  // 容器级 click 委托：识别 a[href] 拦截并交由系统默认浏览器打开；识别带 data-path 的元素转给 onPathClick
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const t = e.target;
      if (t instanceof HTMLElement) {
        const anchor = t.closest('a');
        if (anchor?.href && /^https?:\/\//i.test(anchor.href)) {
          e.preventDefault();
          window.muicv.shell.openExternal(anchor.href);
          return;
        }
        if (!onPathClick) return;
        const path = t.getAttribute('data-path');
        if (path) {
          e.preventDefault();
          onPathClick(path);
        }
      }
    },
    [onPathClick],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 容器级事件委托拦截链接与文件路径点击
    // biome-ignore lint/a11y/useKeyWithClickEvents: 内部子元素本身有键盘语义或原生链接
    <div onClick={onClick} className={`prose-mui space-y-3 text-[14px] leading-[1.7] text-ink-soft ${className ?? ''}`}>
      {blocks.map((b, idx) => {
        const key = `${b.type}-${idx}`;
        if (b.type === 'frontmatter') {
          return (
            <div key={key} className="rounded-lg border border-rule bg-paper px-3 py-2 font-mono text-[12px] text-mute">
              {b.entries.map(([k, v]) => (
                <div key={k}>
                  <span className="text-yellow-deep">{k}</span>
                  <span className="text-ink-soft">: {v}</span>
                </div>
              ))}
            </div>
          );
        }
        if (b.type === 'h') {
          const sizes: Record<number, string> = {
            1: 'text-[24px] font-extrabold tracking-tight text-ink mt-2',
            2: 'text-[18px] font-extrabold text-ink mt-3',
            3: 'text-[16px] font-bold text-ink mt-2',
            4: 'text-[14px] font-bold text-ink-soft uppercase tracking-wider mt-2',
          };
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
          return <div key={key} className={sizes[b.level]} dangerouslySetInnerHTML={{ __html: inlineHtml(b.text) }} />;
        }
        if (b.type === 'p') {
          // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
          return <p key={key} dangerouslySetInnerHTML={{ __html: inlineHtml(b.text) }} />;
        }
        if (b.type === 'ul') {
          return (
            <ul key={key} className="ml-5 list-disc space-y-1">
              {b.items.map((it, i) => (
                // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
                <li key={i} dangerouslySetInnerHTML={{ __html: inlineHtml(it) }} />
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={key} className="ml-5 list-decimal space-y-1">
              {b.items.map((it, i) => (
                // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
                <li key={i} dangerouslySetInnerHTML={{ __html: inlineHtml(it) }} />
              ))}
            </ol>
          );
        }
        if (b.type === 'pre') {
          return (
            <pre
              key={key}
              className="overflow-x-auto rounded-lg border border-rule bg-paper p-3 font-mono text-[12px] leading-[1.55] text-ink-soft"
            >
              <code>{b.code}</code>
            </pre>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote
              key={key}
              className="rounded-lg border border-rule-strong bg-fluff/40 px-3 py-2 text-[14px] text-ink-soft"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
              dangerouslySetInnerHTML={{ __html: inlineHtml(b.text) }}
            />
          );
        }
        if (b.type === 'hr') {
          return <hr key={key} className="border-rule" />;
        }
        if (b.type === 'table') {
          const alignClass = (a: Align): string =>
            a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';
          return (
            <div key={key} className="overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="border-b-2 border-rule-strong text-ink">
                    {b.head.map((cell, ci) => (
                      <th
                        key={ci}
                        className={`px-3 py-1.5 font-bold ${alignClass(b.aligns[ci] ?? 'left')}`}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
                        dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, ri) => (
                    <tr key={ri} className="border-b border-rule">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-3 py-1.5 align-top ${alignClass(b.aligns[ci] ?? 'left')}`}
                          // biome-ignore lint/security/noDangerouslySetInnerHtml: 输入已经 escapeHtml 过
                          dangerouslySetInnerHTML={{ __html: inlineHtml(cell) }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
