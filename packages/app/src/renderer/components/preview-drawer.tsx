import { Tabs } from '@base-ui/react/tabs';
import { Button } from '@muicv/ui';
import { FileTextIcon, SidebarSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useAppStore } from '../lib/store';
import { useEnterAnimation } from '../lib/use-enter-animation';
import { EditDrawer } from './edit-drawer';
import { PreviewContent } from './preview-drawer/preview-content';

const TRANSITION_MS = 220;

/**
 * 临时全屏抽屉预览：
 *
 * 在分栏（保持打开）之外，当用户需要临时沉浸查看大图、复杂排版 PDF 时，
 * 从右侧滑入 80% 宽度的抽屉。按 ESC、点击背景遮罩或收起按钮即可关闭抽屉，
 * 恢复原本的分栏视图。
 */
export function PreviewDrawer() {
  const { paths, activePath } = useAppStore((s) => s.previewTabs);
  const isOpen = useAppStore((s) => s.previewDrawerOpen);
  const openPreview = useAppStore((s) => s.openRightPanel);
  const closeTab = useAppStore((s) => s.closePreviewTab);
  const closeDrawer = useAppStore((s) => s.closeDrawerPreview);
  const [editingPath, setEditingPath] = useState<string | null>(null);

  const { mounted, visible } = useEnterAnimation(isOpen ? true : null, TRANSITION_MS);

  useEffect(() => {
    if (!isOpen || editingPath) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, editingPath, closeDrawer]);

  if (!mounted || !activePath) return null;

  return createPortal(
    <div className="titlebar-no-drag fixed inset-0 z-[90] flex justify-end">
      <div
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
        onClick={closeDrawer}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="临时文件预览"
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        className={`relative flex h-full w-full max-w-[1100px] flex-col border-l-2 border-ink bg-paper shadow-[-5px_0_0_0_var(--color-ink)] transition-transform ease-out sm:w-[80%] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Tabs.Root
          value={activePath}
          onValueChange={(path) => {
            if (typeof path === 'string') openPreview(path);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 items-center gap-1 border-b border-rule bg-cream px-2">
            <Tabs.List aria-label="已打开的文件" className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 py-1.5">
              {paths.map((path) => (
                <Tabs.Tab
                  key={path}
                  value={path}
                  title={path}
                  ref={
                    path === activePath
                      ? (tab) => tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                      : undefined
                  }
                  className="flex h-8 max-w-48 shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2 text-left text-xs text-mute hover:bg-fluff hover:text-ink focus-visible:outline-2 focus-visible:outline-ink data-active:border-rule-strong data-active:bg-paper-deep data-active:font-bold data-active:text-ink"
                >
                  <FileTextIcon size={14} className="shrink-0" />
                  <span className="truncate">{path.split(/[/\\]/).pop() ?? path}</span>
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Button
              size="icon-xs"
              variant="ghost"
              title="关闭当前标签"
              aria-label="关闭当前标签"
              onClick={() => closeTab(activePath)}
            >
              <XIcon weight="bold" />
            </Button>
            <Button size="xs" variant="ghost" title="收起临时抽屉（返回分栏）" onClick={closeDrawer}>
              <SidebarSimpleIcon className="-scale-x-100" />
              收起抽屉
            </Button>
          </div>
          {paths.map((path) => (
            <Tabs.Panel key={path} value={path} className="flex min-h-0 flex-1 flex-col">
              <PreviewContent path={path} onEdit={setEditingPath} />
            </Tabs.Panel>
          ))}
        </Tabs.Root>
      </aside>
      <EditDrawer path={editingPath} onClose={() => setEditingPath(null)} />
    </div>,
    document.body,
  );
}
