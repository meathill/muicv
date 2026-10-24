import { CircleIcon, PencilSimpleIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import { CONVERSATION_TYPE_META, type ConversationType } from '../../shared/types.ts';
import { CONVERSATION_TYPE_ICON } from '../lib/conversation-type-icon';
import { useAppStore } from '../lib/store';
import { useClickOutside } from '../lib/use-click-outside';
import { stripLeadingEmoji } from './chat-utils';
import { ConfirmDialog } from './confirm-dialog';

const ALL_TYPES: ConversationType[] = ['core', 'generate', 'critique', 'jobs', 'interview', 'coaching'];

/**
 * 左栏中部：对话列表 + 顶部「+ 新建」（弹类型选择菜单）+ 行内重命名 / 删除。
 *
 * 每行点击 → switchConversation。hover 露出重命名 / 删除按钮。
 */
export function ConversationList() {
  const conversations = useAppStore((s) => s.conversations);
  const activeConv = useAppStore((s) => s.activeConversation);
  const switchConversation = useAppStore((s) => s.switchConversation);
  const createConversation = useAppStore((s) => s.createConversation);

  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useClickOutside(pickerRef, picking, () => setPicking(false));

  async function pick(type: ConversationType) {
    setPicking(false);
    await createConversation(type);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={pickerRef} className="relative flex shrink-0 items-center justify-between px-3 py-2">
        <p className="text-[12px] font-bold uppercase tracking-wider text-mute">对话</p>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="press rounded-md bg-yellow px-2 py-0.5 text-[12px] font-bold text-ink"
        >
          + 新建
        </button>
        {picking && (
          <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-[0_5px_0_0_var(--color-ink)]">
            <p className="px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-mute">挑一种对话类型</p>
            {ALL_TYPES.map((t) => {
              const meta = CONVERSATION_TYPE_META[t];
              const TypeIcon = CONVERSATION_TYPE_ICON[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => void pick(t)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-fluff"
                >
                  <TypeIcon size={16} className="mt-0.5 shrink-0 text-yellow-deep" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-ink">{meta.label}</span>
                    <span className="block text-[12px] leading-[1.5] text-mute">{meta.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] leading-[1.65] text-mute">
            还没有对话。
            <br />
            点上面的 +新建 来一份吧。
          </div>
        ) : (
          conversations.map((c) => (
            <ConversationRow
              key={c.id}
              convId={c.id}
              title={c.title}
              updatedAt={c.updatedAt}
              type={c.type}
              active={activeConv?.id === c.id}
              onSwitch={() => void switchConversation(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  convId,
  title,
  type,
  updatedAt,
  active,
  onSwitch,
}: {
  convId: string;
  title: string;
  type: ConversationType;
  updatedAt: number;
  active: boolean;
  onSwitch: () => void;
}) {
  const renameConversation = useAppStore((s) => s.renameConversation);
  const removeConversation = useAppStore((s) => s.removeConversation);

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(title);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => setName(title), [title]);

  function commit() {
    if (name.trim() && name !== title) void renameConversation(convId, name.trim());
    setRenaming(false);
  }

  if (renaming) {
    return (
      <div className="rounded-md border-2 border-ink bg-fluff px-2 py-1.5">
        <input
          type="text"
          value={name}
          // biome-ignore lint/a11y/noAutofocus: 行内重命名框出现即聚焦是刻意交互
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setName(title);
              setRenaming(false);
            }
          }}
          className="block w-full rounded bg-cream px-2 py-1 text-[12px] font-bold text-ink focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-md px-2 py-1.5 ${active ? 'bg-fluff' : 'hover:bg-fluff/60'}`}
    >
      <button type="button" onClick={onSwitch} className="flex min-w-0 flex-1 flex-col items-start text-left">
        <div className="flex w-full items-center gap-1.5">
          {active && <CircleIcon size={8} weight="fill" className="shrink-0 text-yellow-deep" />}
          <span className="truncate text-[12px] font-bold text-ink">{stripLeadingEmoji(title)}</span>
        </div>
        <span className="text-[12px] text-mute">{relTime(updatedAt)}</span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          title="重命名"
          aria-label="重命名"
          onClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
          className="flex items-center justify-center rounded px-1.5 py-0.5 text-mute hover:bg-paper hover:text-ink"
        >
          <PencilSimpleIcon size={12} />
        </button>
        <button
          type="button"
          title="删除对话"
          aria-label="删除对话"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmRemove(true);
          }}
          className="flex items-center justify-center rounded px-1.5 py-0.5 text-mute hover:bg-tongue/10 hover:text-tongue"
        >
          <XIcon size={12} weight="bold" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={`删除对话「${title}」？`}
        description={
          <>
            这份对话和它的全部消息都会从磁盘删掉，无法恢复。
            <br />
            <span className="text-[12px] text-mute">类型：{CONVERSATION_TYPE_META[type].label}</span>
          </>
        }
        confirmLabel="删除"
        destructive
        onConfirm={() => {
          setConfirmRemove(false);
          void removeConversation(convId);
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}-${d.getDate()}`;
}
