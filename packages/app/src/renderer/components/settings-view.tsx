import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CpuIcon,
  GearSixIcon,
  PuzzlePieceIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import type { UpdaterStatus } from '../../shared/types.ts';
import { useAppStore } from '../lib/store';
import { CorgiMascot } from './corgi-mascot';
import { Avatar } from './settings/bits';
import { CustomLlmCard } from './settings/custom-llm-card';
import { ModelCard } from './settings/model-card';
import { MuirouterCard } from './settings/muirouter-card';
import { PlanCard } from './settings/plan-card';
import { SkillMarketCard } from './settings/skill-market-card';
import { ThemeCard } from './settings/theme-card';
import { WhisperEngineCard } from './settings/whisper-engine-card';

const LATEST_FEEDBACK_MS = 5_000;

type SettingsSectionId = 'general' | 'models' | 'skills';

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId;
  title: string;
  hint: string;
  Icon: typeof GearSixIcon;
}> = [
  { id: 'general', title: '通用', hint: '账号、主题、版本', Icon: GearSixIcon },
  { id: 'models', title: '模型', hint: 'LLM、BYOK、本地转写', Icon: CpuIcon },
  { id: 'skills', title: 'Skill', hint: '内置能力与外部来源', Icon: PuzzlePieceIcon },
];

/**
 * 登录后的设置页。壳层只负责三分组信息架构，业务配置仍落在各 settings/* card 里。
 */
export function SettingsView() {
  const session = useAppStore((s) => s.session);
  const refreshSession = useAppStore((s) => s.refreshSession);
  const logout = useAppStore((s) => s.logout);
  const setView = useAppStore((s) => s.setView);
  const config = useAppStore((s) => s.config);
  const updaterStatus = useAppStore((s) => s.updaterStatus);
  const setUpdaterStatus = useAppStore((s) => s.setUpdaterStatus);
  const [version, setVersion] = useState<string>('');
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');

  useEffect(() => {
    void window.muicv.app.getVersion().then(setVersion);
  }, []);

  if (!session) return null;

  const isBYOK = !!(config.customLlmBase && config.customLlmKey);

  return (
    <div className="h-full overflow-hidden bg-cream">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 px-5 py-6 lg:px-6 lg:py-8">
        <button
          type="button"
          onClick={() => setView('chat')}
          title="返回对话"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-fluff hover:text-ink"
        >
          <ArrowLeftIcon size={13} weight="bold" />
          <span>返回</span>
        </button>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
          <SettingsNav activeSection={activeSection} onChange={setActiveSection} />
          <main className="min-h-0 overflow-y-auto pr-1">
            <div className="flex flex-col gap-4 pb-2">
              {activeSection === 'general' && (
                <GeneralSettings
                  session={session}
                  version={version}
                  updaterStatus={updaterStatus}
                  setUpdaterStatus={setUpdaterStatus}
                  onLogout={logout}
                  onRefreshSession={refreshSession}
                />
              )}

              {activeSection === 'models' && (
                <ModelSettings
                  isBYOK={isBYOK}
                  currentModel={config.defaultModel}
                  hasMuirouterBYOK={session.hasBYOK}
                  muirouter={session.muirouter}
                  onRefreshSession={refreshSession}
                />
              )}

              {activeSection === 'skills' && <SkillMarketCard />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SettingsNav({
  activeSection,
  onChange,
}: {
  activeSection: SettingsSectionId;
  onChange: (section: SettingsSectionId) => void;
}) {
  return (
    <nav aria-label="设置分类" className="min-w-0">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {SETTINGS_SECTIONS.map(({ id, title, hint, Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[156px] items-start gap-2 rounded-lg border-2 px-3 py-2 text-left transition lg:min-w-0 ${
                active
                  ? 'border-ink bg-fluff shadow-[0_2px_0_0_var(--color-ink)]'
                  : 'border-rule bg-paper hover:border-rule-strong hover:bg-fluff/70'
              }`}
            >
              <Icon size={16} weight={active ? 'bold' : 'duotone'} className="mt-0.5 shrink-0 text-yellow-deep" />
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold text-ink">{title}</span>
                <span className="mt-0.5 block text-[12px] leading-[1.35] text-mute">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function GeneralSettings({
  session,
  version,
  updaterStatus,
  setUpdaterStatus,
  onLogout,
  onRefreshSession,
}: {
  session: NonNullable<ReturnType<typeof useAppStore.getState>['session']>;
  version: string;
  updaterStatus: UpdaterStatus;
  setUpdaterStatus: (status: UpdaterStatus) => void;
  onLogout: () => Promise<void>;
  onRefreshSession: () => Promise<void>;
}) {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar session={session} />
          <div className="min-w-0">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">已登录</p>
            <p className="truncate text-[16px] font-extrabold text-ink">{session.name}</p>
            <p className="truncate text-[12px] text-mute">{session.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-lg border-2 border-rule-strong bg-cream px-3 py-1 text-[12px] font-medium text-tongue hover:bg-tongue/10"
        >
          退出登录
        </button>
      </header>

      <PlanCard plan={session.plan} balance={session.balance} onRefresh={onRefreshSession} />
      <ThemeCard />
      <MediaStorageCard />
      <SettingsFooter version={version} updaterStatus={updaterStatus} setUpdaterStatus={setUpdaterStatus} />
    </>
  );
}

function MediaStorageCard() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setMessage('再点一次确认删除');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await window.muicv.media.deleteAll();
      if (!result.ok) {
        // 失败回到初始态：否则按钮停在“确认删除”，下一次点击会跳过二次确认直接删
        setConfirming(false);
        setMessage(result.message);
        return;
      }
      setConfirming(false);
      setMessage(`已删除 ${result.deletedObjects} 个云端文件`);
    } catch (err) {
      setConfirming(false);
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border-2 border-ink bg-paper p-4 shadow-[0_3px_0_0_var(--color-ink)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">云端文件</p>
          <h2 className="mt-1 text-[16px] font-extrabold text-ink">媒体存储</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-mute">
            删除当前账号上传到 R2 的图片、PDF、录音、文档和证件照；本机 inbox 与本地对话记录保留。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={busy}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-[12px] font-extrabold transition disabled:cursor-default disabled:opacity-60 ${
            confirming
              ? 'border-tongue bg-tongue text-cream shadow-[0_2px_0_0_var(--color-ink)]'
              : 'border-rule-strong bg-cream text-tongue hover:bg-tongue/10'
          }`}
        >
          <TrashIcon size={14} weight="bold" />
          <span>{busy ? '删除中' : confirming ? '确认删除' : '删除云端媒体'}</span>
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-[12px] ${confirming ? 'font-semibold text-tongue' : 'text-mute'}`}>{message}</p>
      )}
    </section>
  );
}

function ModelSettings({
  isBYOK,
  currentModel,
  hasMuirouterBYOK,
  muirouter,
  onRefreshSession,
}: {
  isBYOK: boolean;
  currentModel: string;
  hasMuirouterBYOK: boolean;
  muirouter: NonNullable<ReturnType<typeof useAppStore.getState>['session']>['muirouter'];
  onRefreshSession: () => Promise<void>;
}) {
  return (
    <>
      <ModelCard isBYOK={isBYOK} currentModel={currentModel} />
      <MuirouterCard hasBYOK={hasMuirouterBYOK} muirouter={muirouter} onRefresh={onRefreshSession} />
      <CustomLlmCard />
      <WhisperEngineCard />
    </>
  );
}

function SettingsFooter({
  version,
  updaterStatus,
  setUpdaterStatus,
}: {
  version: string;
  updaterStatus: UpdaterStatus;
  setUpdaterStatus: (status: UpdaterStatus) => void;
}) {
  return (
    <footer className="flex flex-wrap items-center gap-2 rounded-lg border border-rule bg-paper px-3 py-2 text-[12px] text-mute">
      <CorgiMascot className="h-5 w-5 shrink-0" />
      <span className="min-w-[180px] flex-1">所有设置只存本地（macOS Keychain 加密），不上传服务器。</span>
      <div className="flex shrink-0 items-center gap-2">
        {version && <span className="font-mono text-[12px] tabular-nums text-mute">v{version}</span>}
        <SettingsUpdateButton status={updaterStatus} setStatus={setUpdaterStatus} />
      </div>
    </footer>
  );
}

function SettingsUpdateButton({
  status,
  setStatus,
}: {
  status: UpdaterStatus;
  setStatus: (status: UpdaterStatus) => void;
}) {
  const [latestHint, setLatestHint] = useState(false);
  const [manualCheckActive, setManualCheckActive] = useState(false);

  useEffect(() => {
    if (!latestHint) return;
    const timer = window.setTimeout(() => setLatestHint(false), LATEST_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [latestHint]);

  useEffect(() => {
    if (!manualCheckActive) return;
    if (status.phase === 'idle' && status.latestVersion) {
      setLatestHint(true);
      setManualCheckActive(false);
    }
    if (status.phase === 'downloading' || status.phase === 'ready' || status.phase === 'error') {
      setManualCheckActive(false);
    }
  }, [manualCheckActive, status.latestVersion, status.phase]);

  async function handleCheck() {
    setLatestHint(false);
    setManualCheckActive(true);
    try {
      const next = await window.muicv.updater.checkNow();
      setStatus(next);
    } catch (err) {
      setManualCheckActive(false);
      setStatus({
        phase: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (status.skipped) return null;

  const isChecking = status.phase === 'checking' || manualCheckActive;
  const isBusy = isChecking || status.phase === 'downloading';
  const hasError = status.phase === 'error';
  const disabled = isBusy || status.phase === 'ready';

  return (
    <button
      type="button"
      onClick={() => void handleCheck()}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md border border-rule bg-cream px-2 py-1 text-[12px] font-semibold text-ink-soft transition hover:border-rule-strong hover:bg-fluff hover:text-ink disabled:cursor-default disabled:text-mute disabled:hover:border-rule disabled:hover:bg-cream disabled:hover:text-mute"
    >
      {hasError ? (
        <WarningIcon size={12} weight="bold" className="text-tongue" />
      ) : (
        <ArrowsClockwiseIcon size={12} weight="bold" className={isChecking ? 'animate-spin' : ''} />
      )}
      <span>{getUpdateButtonLabel(status, latestHint, isChecking)}</span>
    </button>
  );
}

function getUpdateButtonLabel(status: UpdaterStatus, latestHint: boolean, isChecking: boolean): string {
  if (isChecking) return '检查中';
  if (status.phase === 'downloading') return '下载更新';
  if (status.phase === 'ready') return '新版本已就绪';
  if (status.phase === 'error') return '重试更新';
  if (latestHint) return '已是最新版';
  return '检查更新';
}
