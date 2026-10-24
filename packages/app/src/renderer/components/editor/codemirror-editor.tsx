import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useEffect, useRef } from 'react';

/**
 * CodeMirror 6 的极简 React 包裹。不引入 @uiw/react-codemirror：
 * 项目本身没引第三方 React 包装的习惯，单点用一处 30 行手挂更可控。
 *
 * 双向同步策略：
 * - props.value 变化（外部加载新文件 / 切文件）→ effect 用 dispatch 替换全文
 * - 用户输入 → updateListener 把新内容回调给 props.onChange
 * - 比较 doc.toString() 防止外部 set 触发自己的 onChange 形成循环
 */

const muicvTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13.5px',
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    backgroundColor: 'var(--color-paper)',
    color: 'var(--color-ink)',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--color-yellow-deep)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    lineHeight: '1.65',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-cream)',
    color: 'var(--color-mute, oklch(0.6 0.02 70))',
    border: 'none',
    borderRight: '1px solid var(--color-rule)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-fluff)',
    color: 'var(--color-ink)',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-yellow-deep)',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, ::selection, .cm-selectionBackground': {
    backgroundColor: 'var(--color-fluff) !important',
  },
  '&.cm-focused': {
    outline: 'none',
  },
});

export function CodeMirrorEditor(props: { value: string; onChange: (text: string) => void; onSave: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // 用 ref 保留最新 onChange / onSave 引用，避免每次 props 变化都重建 EditorView。
  const onChangeRef = useRef(props.onChange);
  const onSaveRef = useRef(props.onSave);
  onChangeRef.current = props.onChange;
  onSaveRef.current = props.onSave;
  // 初始 doc 只在挂载时取一次；后续外部 value 变更由下方同步 effect 处理
  const initialDocRef = useRef(props.value);

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: initialDocRef.current,
      extensions: [
        basicSetup,
        markdown(),
        muicvTheme,
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              onSaveRef.current();
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onChangeRef.current(u.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 只在挂载/卸载时建一次 view；后续 value 变更走下面那个 effect。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 value 变化（比如切文件）→ 替换文档内容，不发 onChange（doc.toString() 比较）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === props.value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: props.value },
    });
  }, [props.value]);

  return <div ref={hostRef} className="h-full min-h-0 w-full overflow-hidden" />;
}
