import { Tabs } from '@base-ui/react/tabs';
import { Button } from '@muicv/ui';
import { ArrowsOutSimpleIcon, FileTextIcon, FolderSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useState } from 'react';

import { useAppStore } from '../lib/store';
import { EditDrawer } from './edit-drawer';
import { PreviewContent } from './preview-drawer/preview-content';

/**
 * 右栏工件预览面板：
 *
 * 类似 Devin 等业界产品的 split pane 设计，生成新 artifacts 或批量修改后在右栏保持打开，
 * 绝不使用遮罩抽屉遮挡主聊天区。
 *
 * 顶部支持多标签切换、临时全屏抽屉预览（需要沉浸大图或大屏看 PDF 时）、文件树切换以及关闭右栏。
 */
export function PreviewPanel({
  onSwitchToTree,
  onOpenDrawer,
}: {
  onSwitchToTree?: (() => void) | undefined;
  onOpenDrawer?: (() => void) | undefined;
}) {
  const { paths, activePath } = useAppStore((s) => s.previewTabs);
  const openPreview = useAppStore((s) => s.openRightPanel);
  const closeTab = useAppStore((s) => s.closePreviewTab);
  const closePanel = useAppStore((s) => s.closeRightPanel);
  const treeRoot = useAppStore((s) => s.rightPanelTreeRoot);
  const [editingPath, setEditingPath] = useState<string | null>(null);

  if (!activePath || paths.length === 0) return null;

  return (
    <div className="flex h-full w-full min-w-0 flex-1 flex-col bg-paper">
      <Tabs.Root
        value={activePath}
        onValueChange={(path) => {
          if (typeof path === 'string') openPreview(path);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-rule bg-cream px-2 py-1">
          <Tabs.List
            aria-label="已打开的文件"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5"
          >
            {paths.map((path) => {
              const isSelected = path === activePath;
              const fileName = path.split(/[/\\]/).pop() ?? path;
              return (
                <Tabs.Tab
                  key={path}
                  value={path}
                  title={path}
                  ref={isSelected ? (tab) => tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' }) : undefined}
                  className="group relative flex h-7 max-w-44 shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-mute hover:bg-fluff hover:text-ink focus-visible:outline-2 focus-visible:outline-ink data-active:border-rule-strong data-active:bg-paper-deep data-active:font-bold data-active:text-ink"
                >
                  <FileTextIcon size={14} className="shrink-0" />
                  <span className="truncate">{fileName}</span>
                  {/* biome-ignore lint/a11y/useSemanticElements: Tabs.Tab 底层是 button，HTML 不允许嵌套 button，关闭标签按钮用 role=button 避免非法嵌套 */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`关闭 ${fileName}`}
                    title="关闭标签"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(path);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        closeTab(path);
                      }
                    }}
                    className="ml-0.5 hidden h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-rule hover:text-ink group-hover:flex"
                  >
                    <XIcon size={10} weight="bold" />
                  </span>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          <div className="flex shrink-0 items-center gap-0.5">
            {treeRoot && onSwitchToTree && (
              <Button
                size="icon-xs"
                variant="ghost"
                title="浏览工作目录文件"
                aria-label="浏览工作目录文件"
                onClick={onSwitchToTree}
              >
                <FolderSimpleIcon size={14} />
              </Button>
            )}
            {onOpenDrawer && (
              <Button
                size="icon-xs"
                variant="ghost"
                title="在抽屉中临时全屏预览"
                aria-label="在抽屉中临时全屏预览"
                onClick={onOpenDrawer}
              >
                <ArrowsOutSimpleIcon size={14} />
              </Button>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              title="关闭当前标签"
              aria-label="关闭当前标签"
              onClick={() => closeTab(activePath)}
            >
              <XIcon size={12} weight="bold" />
            </Button>
            <div className="mx-1 h-3.5 w-px bg-rule" />
            <Button size="icon-xs" variant="ghost" title="关闭右栏" aria-label="关闭右栏" onClick={closePanel}>
              <XIcon size={14} weight="bold" />
            </Button>
          </div>
        </div>

        {paths.map((path) => (
          <Tabs.Panel key={path} value={path} className="flex min-h-0 flex-1 flex-col">
            <PreviewContent path={path} onEdit={setEditingPath} />
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      <EditDrawer path={editingPath} onClose={() => setEditingPath(null)} />
    </div>
  );
}
