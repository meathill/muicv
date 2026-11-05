import { Button } from '@muicv/ui';
import { FilesIcon, XIcon } from '@phosphor-icons/react';

import { useAppStore } from '../lib/store';
import { FileTree } from './file-tree';
import { PreviewPanel } from './preview-panel';

/**
 * 右栏：承载工件预览与工作目录文件树。
 *
 * 遵循业界（Devin 等）通用交互：
 * - 生成新 artifacts 或批量修改时，右栏平级打开并保持展开（不阻断对话）
 * - 支持随时点击关闭右栏或关闭单个标签
 * - 提供临时全屏抽屉预览入口，满足沉浸查看大图/PDF 需求
 * - 可在工件预览与工作目录文件树之间平滑切换
 */
export function SidebarRight() {
  const treeRoot = useAppStore((s) => s.rightPanelTreeRoot);
  const rightPanelView = useAppStore((s) => s.rightPanelView);
  const setRightPanelView = useAppStore((s) => s.setRightPanelView);
  const previewTabs = useAppStore((s) => s.previewTabs);
  const openDrawerPreview = useAppStore((s) => s.openDrawerPreview);
  const closePanel = useAppStore((s) => s.closeRightPanel);
  const openPreview = useAppStore((s) => s.openRightPanel);
  const activeProfile = useAppStore((s) => s.activeProfile);

  const hasTabs = previewTabs.paths.length > 0 && previewTabs.activePath !== null;
  const isPreviewMode = rightPanelView === 'preview' && hasTabs;

  if (isPreviewMode) {
    return (
      <aside className="relative flex h-full w-full flex-col border-l-2 border-ink bg-paper">
        <PreviewPanel
          onSwitchToTree={treeRoot ? () => setRightPanelView('tree') : undefined}
          onOpenDrawer={openDrawerPreview}
        />
      </aside>
    );
  }

  if (treeRoot) {
    return (
      <aside className="relative flex h-full w-full flex-col border-l-2 border-ink bg-paper">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-rule bg-cream px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[12px] uppercase tracking-wider text-mute">文件浏览</p>
            <p className="truncate text-[14px] font-bold text-ink" title={treeRoot}>
              {activeProfile?.name ?? '工作目录'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {hasTabs && (
              <Button
                size="xs"
                variant="ghost"
                title="返回工件预览"
                aria-label="返回工件预览"
                onClick={() => setRightPanelView('preview')}
              >
                <FilesIcon size={14} />
                工件 ({previewTabs.paths.length})
              </Button>
            )}
            <Button size="icon-xs" variant="ghost" title="关闭右栏" aria-label="关闭右栏" onClick={closePanel}>
              <XIcon size={14} weight="bold" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <FileTree rootPath={treeRoot} onPickFile={openPreview} />
        </div>
      </aside>
    );
  }

  return null;
}
