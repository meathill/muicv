import { BriefcaseIcon } from '@phosphor-icons/react';

import { useAppStore } from '../lib/store';
import { ConversationList } from './conversation-list';
import { ProfileSection } from './sidebar-left-profile';
import { UserSection } from './sidebar-left-user';
import { UpdateCard } from './update-card';

/**
 * 左栏 IDE 风格 navigator：
 *   1. 顶部 profile 切换器（带文件树按钮）
 *   2. 岗位库入口
 *   3. 中部对话列表
 *   3. 自动更新卡片（dev 模式不渲染）
 *   4. 底部用户菜单
 */
export function SidebarLeft() {
  return (
    <aside className="flex h-full w-full flex-col border-r-2 border-ink bg-cream/95">
      <ProfileSection />
      <div className="h-px bg-rule" />
      <JobsEntry />
      <div className="h-px bg-rule" />
      <ConversationList />
      <UpdateCard />
      <div className="h-px bg-rule" />
      <UserSection />
    </aside>
  );
}

function JobsEntry() {
  const active = useAppStore((s) => s.view === 'jobs');
  const setView = useAppStore((s) => s.setView);
  return (
    <button
      type="button"
      onClick={() => setView('jobs')}
      className={`mx-2 my-2 flex items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] font-bold transition ${
        active ? 'bg-yellow text-ink' : 'text-ink-soft hover:bg-paper'
      }`}
    >
      <BriefcaseIcon size={16} weight="bold" />
      岗位库
    </button>
  );
}
