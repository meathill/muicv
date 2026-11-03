import { Button } from '@muicv/ui';
import {
  CaretDownIcon,
  CircleIcon,
  FolderOpenIcon,
  FolderSimpleIcon,
  PencilSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

import type { Profile } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';
import { useClickOutside } from '../lib/use-click-outside';
import { ConfirmDialog } from './confirm-dialog';
import { CorgiMascot } from './corgi-mascot';

/**
 * 顶部的 profile 切换器：当前 profile 名 + 下拉切换 + 进文件树按钮。
 * 下拉里支持重命名 / 在 Finder 里打开 / 移除 / 新建。
 */
export function ProfileSection() {
  const profiles = useAppStore((s) => s.config.profiles);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const switchProfile = useAppStore((s) => s.switchProfile);
  const renameProfile = useAppStore((s) => s.renameProfile);
  const removeProfile = useAppStore((s) => s.removeProfile);
  const openInFinder = useAppStore((s) => s.openProfileInFinder);
  const createPick = useAppStore((s) => s.createProfilePickFolder);
  const openFileTree = useAppStore((s) => s.openFileTree);
  const closeRightPanel = useAppStore((s) => s.closeRightPanel);
  const treeOpen = useAppStore((s) => s.rightPanelTreeRoot !== null);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));

  return (
    <div ref={ref} className="relative shrink-0">
      <div className="flex w-full min-w-0 items-center gap-2 px-3 py-3">
        {/* 布局型触发行（mascot + 文本 + caret），Button 的固定高度/居中/nowrap 会破坏布局，保留原生 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={activeProfile?.dir}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <CorgiMascot className="h-7 w-7 shrink-0" />
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-deep" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">
            {activeProfile?.name ?? 'Mui简历'}
          </span>
          <CaretDownIcon size={11} weight="bold" className="shrink-0 text-mute" />
        </button>
        {activeProfile && (
          <Button
            onClick={() => {
              setOpen(false);
              if (treeOpen) closeRightPanel();
              else openFileTree();
            }}
            title={treeOpen ? '关闭文件浏览' : '查看文件'}
            aria-label={treeOpen ? '关闭文件浏览' : '查看文件'}
            aria-pressed={treeOpen}
            size="icon-xs"
            variant="ghost"
            className={
              treeOpen ? 'bg-fluff text-yellow-deep hover:bg-fluff' : 'text-mute hover:bg-fluff hover:text-ink'
            }
          >
            {treeOpen ? <FolderOpenIcon size={16} weight="fill" /> : <FolderSimpleIcon size={16} />}
          </Button>
        )}
      </div>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border-2 border-ink bg-cream p-1.5 shadow-[0_5px_0_0_var(--color-ink)]">
          <div className="max-h-[40vh] overflow-y-auto">
            {profiles.map((p) => (
              <ProfileItem
                key={p.id}
                profile={p}
                isActive={p.id === activeProfile?.id}
                canDelete={profiles.length > 1}
                onSwitch={() => {
                  if (p.id !== activeProfile?.id) void switchProfile(p.id);
                  setOpen(false);
                }}
                onRename={(name) => void renameProfile(p.id, name)}
                onRemove={() => void removeProfile(p.id)}
                onOpenInFinder={() => void openInFinder(p.id)}
              />
            ))}
          </div>
          <div className="my-1 h-px bg-rule" />
          <CreateInline
            onCreate={async (name) => {
              const r = await createPick(name);
              if (r.ok) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ProfileItem({
  profile,
  isActive,
  canDelete,
  onSwitch,
  onRename,
  onRemove,
  onOpenInFinder,
}: {
  profile: Profile;
  isActive: boolean;
  canDelete: boolean;
  onSwitch: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onOpenInFinder: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => setName(profile.name), [profile.name]);

  function commit() {
    if (name.trim() && name !== profile.name) onRename(name.trim());
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
              setName(profile.name);
              setRenaming(false);
            }
          }}
          className="block w-full rounded-md bg-cream px-2 py-1 text-[14px] font-bold text-ink focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 ${
        isActive ? 'bg-fluff' : 'hover:bg-fluff/60'
      }`}
    >
      {/* 布局型触发行（状态点 + 档案名），同上保留原生 button */}
      <button
        type="button"
        onClick={onSwitch}
        title={profile.dir}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        {isActive && <CircleIcon size={8} weight="fill" className="shrink-0 text-yellow-deep" />}
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{profile.name}</span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        <IconBtn title="重命名" onClick={() => setRenaming(true)}>
          <PencilSimpleIcon size={12} />
        </IconBtn>
        <IconBtn title="在文件管理器里打开" onClick={onOpenInFinder}>
          <FolderOpenIcon size={12} />
        </IconBtn>
        {canDelete && (
          <IconBtn title="从列表里移除（不删文件）" onClick={() => setConfirmRemove(true)} danger>
            <XIcon size={12} weight="bold" />
          </IconBtn>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={`从 app 里移除「${profile.name}」？`}
        description={
          <>
            只是从列表去掉，磁盘上的文件不会删。
            <br />
            <span className="font-mono text-[12px] text-mute">{profile.dir}</span>
          </>
        }
        confirmLabel="移除"
        destructive
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
  danger,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      size="icon-xs"
      variant="ghost"
      className={`rounded ${danger ? 'text-mute hover:bg-tongue/10 hover:text-tongue' : 'text-mute hover:bg-paper hover:text-ink'}`}
    >
      {children}
    </Button>
  );
}

function CreateInline({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  if (!editing) {
    return (
      <Button
        onClick={() => setEditing(true)}
        variant="ghost"
        size="xs"
        className="w-full justify-start text-yellow-deep hover:bg-fluff"
      >
        + 新建职业档案
      </Button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border-2 border-ink bg-fluff p-2">
      <input
        type="text"
        value={name}
        // biome-ignore lint/a11y/noAutofocus: 新建档案输入框出现即聚焦是刻意交互
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void onCreate(name.trim());
          if (e.key === 'Escape') {
            setEditing(false);
            setName('');
          }
        }}
        placeholder="例如：程序员 / 厨师 / 自由插画师"
        className="block w-full rounded-md border-2 border-rule-strong bg-cream px-2 py-1 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />
      <div className="flex gap-1">
        <Button
          onClick={() => name.trim() && void onCreate(name.trim())}
          disabled={!name.trim()}
          variant="press"
          size="xs"
          className="flex-1"
        >
          选择目录
        </Button>
        <Button
          onClick={() => {
            setEditing(false);
            setName('');
          }}
          variant="ghost"
          size="xs"
          className="text-mute hover:text-ink"
        >
          取消
        </Button>
      </div>
    </div>
  );
}
