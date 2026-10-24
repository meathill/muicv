import { TitleBar } from './title-bar';

/**
 * App 启动期（bootstrap 中）展示的骨架屏。
 * 镜像 AppShell 的三栏布局，让用户启动瞬间就感知到应用框架。
 */
export function AppSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-cream">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[260px] shrink-0 flex-col border-r-2 border-ink bg-cream/95">
          <div className="space-y-2 px-3 py-3">
            <SkBlock className="h-4 w-20" />
            <SkBlock className="h-9 w-full" />
          </div>
          <div className="h-px bg-rule" />
          <div className="flex-1 px-3 py-2">
            <div className="mb-2 flex items-center justify-between">
              <SkBlock className="h-3 w-10" />
              <SkBlock className="h-5 w-12" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 骨架屏是静态占位行，永不重排，位置就是身份
                <ConversationRowSk key={i} />
              ))}
            </div>
          </div>
          <div className="h-px bg-rule" />
          <div className="px-3 py-3">
            <SkBlock className="h-9 w-full" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 px-6 py-6">
            <BubbleSk align="left" widthClass="w-2/3" />
            <BubbleSk align="right" widthClass="w-1/2" />
            <BubbleSk align="left" widthClass="w-3/4" />
          </div>
          <div className="border-t border-rule px-4 py-3">
            <SkBlock className="h-12 w-full" />
          </div>
        </main>
      </div>
    </div>
  );
}

function SkBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-rule/40 ${className}`} />;
}

function ConversationRowSk() {
  return (
    <div className="space-y-1 px-2 py-1.5">
      <SkBlock className="h-3.5 w-3/4" />
      <SkBlock className="h-2.5 w-1/3" />
    </div>
  );
}

function BubbleSk({ align, widthClass }: { align: 'left' | 'right'; widthClass: string }) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
      <SkBlock className={`h-16 ${widthClass}`} />
    </div>
  );
}
