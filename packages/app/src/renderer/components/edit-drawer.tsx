import { Button } from '@muicv/ui';
import { CircleIcon, FloppyDiskIcon, WarningIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAppStore } from '../lib/store';
import { useEnterAnimation } from '../lib/use-enter-animation';
import { ConfirmDialog } from './confirm-dialog';
import { CodeMirrorEditor } from './editor/codemirror-editor';

const TRANSITION_MS = 220;

/**
 * 文件编辑 drawer。叠加在 PreviewDrawer 之上（z-index 更高），形成"预览 → 编辑"
 * 的双层 drawer。组件单一职责：只负责编辑，不感知 PreviewDrawer 的存在。
 *
 * 状态走 store 的 editor*（editorOpenPath / editorBuffer / editorOriginal / ...）：
 *   - mount：openEditorFile(path) 装载文件内容
 *   - 关闭：closeEditorFile() 清状态
 *
 * 与 editor-view（旧的独立路由）共用 store，但不会共存：editor-view 已废弃。
 *
 * 动画：跟 PreviewDrawer 一致的双 rAF + translate / opacity 切换。
 */
export function EditDrawer({ path, onClose }: { path: string | null; onClose: () => void }) {
  // 状态订阅（触发 re-render）和 actions（直接调用、不进 useEffect deps）分开。
  // zustand action 引用理论上稳定，但放进 useEffect deps 一旦不稳定就会让动画 effect
  // 反复 cleanup → cancelRAF → 永远进不了 visible=true。用 getState() 调用避免这个隐患。
  const editorOpenPath = useAppStore((s) => s.editorOpenPath);
  const editorBuffer = useAppStore((s) => s.editorBuffer);
  const editorOriginal = useAppStore((s) => s.editorOriginal);
  const editorSaving = useAppStore((s) => s.editorSaving);
  const editorLastSavedAt = useAppStore((s) => s.editorLastSavedAt);
  const editorError = useAppStore((s) => s.editorError);
  const setEditorBuffer = useAppStore((s) => s.setEditorBuffer);

  const { mounted: mountedPath, visible } = useEnterAnimation(path, TRANSITION_MS);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);

  const dirty = editorBuffer !== editorOriginal;
  const fileName = mountedPath?.split(/[/\\]/).pop() ?? '';

  // path 变化 → 装载 / 卸载文件。动画归 useEnterAnimation 管，本 effect 只跑副作用。
  // deps 只放 path，杜绝 zustand action 引用不稳定导致的多次 cleanup。
  useEffect(() => {
    if (path) {
      void useAppStore.getState().openEditorFile(path);
      return;
    }
    const t = setTimeout(() => useAppStore.getState().closeEditorFile(), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [path]);

  // 保存成功后 2 秒内闪一下"已保存 hh:mm:ss"
  useEffect(() => {
    if (!savedJustNow) return;
    const t = setTimeout(() => setSavedJustNow(false), 2000);
    return () => clearTimeout(t);
  }, [savedJustNow]);

  const requestClose = useCallback(() => {
    if (dirty) {
      setPendingClose(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  // ESC 关闭（dirty 时弹确认框）
  useEffect(() => {
    if (!mountedPath) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mountedPath, requestClose]);

  const handleSave = useCallback(async () => {
    const r = await useAppStore.getState().saveEditor();
    if (r.ok) setSavedJustNow(true);
  }, []);

  if (!mountedPath) return null;

  return createPortal(
    // titlebar-no-drag：同 PreviewDrawer，避免 TitleBar 的 -webkit-app-region: drag
    // 在顶部 44px 内吃掉按钮 click（参见 preview-drawer.tsx 同名注释）。
    <div className="titlebar-no-drag fixed inset-0 z-[100] flex justify-end">
      <div
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
        onClick={requestClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="文件编辑"
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        className={`relative flex h-full w-full max-w-[920px] flex-col border-l-2 border-ink bg-paper shadow-[-5px_0_0_0_var(--color-ink)] transition-transform ease-out sm:w-[72%] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex shrink-0 items-center gap-3 border-b-2 border-rule bg-cream px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[12px] uppercase tracking-wider text-mute">编辑</p>
            <p className="truncate text-[14px] font-bold text-ink" title={mountedPath}>
              {fileName}
            </p>
          </div>
          <EditStatus
            dirty={dirty}
            saving={editorSaving}
            savedJustNow={savedJustNow}
            lastSavedAt={editorLastSavedAt}
            hasPath={Boolean(editorOpenPath)}
          />
          <Button
            onClick={handleSave}
            disabled={!dirty || editorSaving}
            title="保存（⌘S）"
            variant="press"
            size="xs"
            className="disabled:opacity-50"
          >
            <FloppyDiskIcon size={12} weight="bold" />
            保存
          </Button>
          <Button
            onClick={requestClose}
            title="关闭编辑"
            aria-label="关闭编辑"
            variant="ghost"
            size="icon-xs"
            className="text-mute hover:bg-fluff hover:text-ink"
          >
            <XIcon size={14} weight="bold" />
          </Button>
        </header>

        {editorError && (
          <div className="shrink-0 border-b border-tongue/40 bg-tongue/10 px-4 py-2 text-[12px] text-tongue">
            <WarningIcon size={12} weight="bold" className="mr-1 inline-block align-text-bottom" />
            {editorError}
          </div>
        )}

        <div className="min-h-0 flex-1">
          {editorOpenPath === mountedPath ? (
            <CodeMirrorEditor value={editorBuffer} onChange={setEditorBuffer} onSave={() => void handleSave()} />
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-mute">读取中…</div>
          )}
        </div>

        <ConfirmDialog
          open={pendingClose}
          title="丢弃未保存的修改？"
          description={
            <>
              当前文件还有未保存的修改。
              <br />
              <span className="text-mute">点取消可以先按 ⌘S 保存再关闭。</span>
            </>
          }
          confirmLabel="丢弃并关闭"
          destructive
          onConfirm={() => {
            setPendingClose(false);
            onClose();
          }}
          onCancel={() => setPendingClose(false)}
        />
      </aside>
    </div>,
    document.body,
  );
}

function formatHHMMSS(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function EditStatus({
  dirty,
  saving,
  savedJustNow,
  lastSavedAt,
  hasPath,
}: {
  dirty: boolean;
  saving: boolean;
  savedJustNow: boolean;
  lastSavedAt: number | null;
  hasPath: boolean;
}) {
  if (saving) return <span className="shrink-0 text-[12px] text-mute">保存中…</span>;
  if (savedJustNow && lastSavedAt) {
    return <span className="shrink-0 text-[12px] text-yellow-deep">已保存 {formatHHMMSS(lastSavedAt)}</span>;
  }
  if (dirty) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-yellow-deep">
        <CircleIcon size={8} weight="fill" />
        未保存
      </span>
    );
  }
  if (hasPath) return <span className="shrink-0 text-[12px] text-mute">已同步</span>;
  return null;
}
