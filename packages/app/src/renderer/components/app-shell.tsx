import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { useAudioTranscoder } from '../lib/use-audio-transcoder';
import { ChatView } from './chat-view';
import { OnboardingView } from './onboarding-view';
import { PreviewDrawer } from './preview-drawer';
import { SettingsView } from './settings-view';
import { SidebarLeft } from './sidebar-left';
import { SidebarRight } from './sidebar-right';
import { TitleBar } from './title-bar';

/**
 * View 路由映射：login 由外层处理，这里只覆盖已登录后的中栏 view。
 * 比嵌套三元更可读，新增 view 时单点扩展。
 */
const VIEW_MAP: Record<'onboarding' | 'chat' | 'settings', ComponentType> = {
  onboarding: OnboardingView,
  chat: ChatView,
  settings: SettingsView,
};

/**
 * 三栏布局：left navigator | center main | right file tree。
 *
 * 左栏可折叠（默认展开）；右栏只在 rightPanelTreeRoot 不空时展开。
 * 文件预览走全局 PreviewDrawer（drawer overlay），跟右栏解耦。
 * 中栏是 view 路由（chat / settings 切换），不再切左右栏。
 */
export function AppShell() {
  const view = useAppStore((s) => s.view);
  const leftCollapsed = useAppStore((s) => s.leftCollapsed);
  const rightCollapsed = useAppStore((s) => s.rightCollapsed);
  const treeRoot = useAppStore((s) => s.rightPanelTreeRoot);
  const rightWidth = useAppStore((s) => s.rightPanelWidth);

  // M4：监听 main 端 transcribe_audio_file 工具发起的转码请求，
  // 把任意音频转成 16k mono WAV 回传。无 UI。
  useAudioTranscoder();

  const showRight = !rightCollapsed && treeRoot !== null;

  return (
    <div className="flex h-screen flex-col bg-cream">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        {!leftCollapsed && (
          <div className="w-[260px] shrink-0">
            <SidebarLeft />
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-hidden">
          {(() => {
            const ViewComponent = VIEW_MAP[view as keyof typeof VIEW_MAP] ?? ChatView;
            return <ViewComponent />;
          })()}
        </main>
        {showRight && (
          <>
            <RightResizeHandle />
            <div style={{ width: rightWidth }} className="shrink-0">
              <SidebarRight />
            </div>
          </>
        )}
      </div>
      <PreviewDrawer />
    </div>
  );
}

/**
 * 右栏左边的拖拽手柄。鼠标按下后全局监听 mousemove，按"窗口右边缘到鼠标 X"
 * 的距离更新右栏宽度（store 自动 clamp + 持久化）。
 *
 * 拖动时挂一个 fixed overlay：因为右栏里的 PDF viewer 是 OOP iframe，
 * 鼠标飘进去时 mousemove 不会冒泡到主进程窗口 → handle 收不到事件、
 * 拖动假死。overlay 把整个窗口的 pointer 事件捕获回主上下文，绕开这个问题。
 */
function RightResizeHandle() {
  const setWidth = useAppStore((s) => s.setRightPanelWidth);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    function onMove(ev: MouseEvent) {
      setWidth(window.innerWidth - ev.clientX);
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, setWidth]);

  return (
    <>
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整右栏宽度"
        title="拖动调整右栏宽度"
        className="w-1 shrink-0 cursor-col-resize bg-rule hover:bg-yellow active:bg-yellow"
      />
      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </>
  );
}
