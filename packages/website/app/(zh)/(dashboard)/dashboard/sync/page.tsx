import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { RESUME_SYNC_BLOB_MAX_SIZE_BYTES, RESUME_SYNC_HISTORY_KEEP, RESUME_SYNC_MAX_SIZE_BYTES } from '@muicv/shared';

import { getAuth } from '@/lib/auth';
import { getResumeBlobSyncStatus, getResumeSyncStatus } from '@/lib/resume-sync';

import { BlobHistoryRowActions, BlobWipeButton, HistoryRowActions, WipeButton } from './sync-actions';

export const metadata: Metadata = {
  title: '云同步',
};

export default async function ResumeSyncPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const [plain, blob] = await Promise.all([
    getResumeSyncStatus(session.user.id),
    getResumeBlobSyncStatus(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 云同步</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          MuiCV 平台云同步
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          用 muicv-sync 技能把当前工作目录的素材文件上传到云端；新机器可以再下载回来。两条路径：
          <strong>加密路径</strong>（推荐）—— 客户端 zip 加密后上传，服务端只看到密文；
          <strong>明文路径</strong> —— 服务端按文件存，dashboard 上能看到列表，仅支持 .md。 云端各保留一份当前版 + 最近{' '}
          {RESUME_SYNC_HISTORY_KEEP} 份历史。
        </p>
      </header>

      <BlobActiveCard active={blob.active} />
      <BlobHistoryList items={blob.history} />

      <ActiveCard active={plain.active} />
      <SkillHints />
      <HistoryList items={plain.history} />
    </div>
  );
}

function BlobActiveCard({
  active,
}: {
  active: { blobId: string; summary: string; sizeBytes: number; updatedAt: number } | null;
}) {
  if (!active) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— 加密版（推荐）</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">还没有加密快照</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          跟 muicv-sync 说"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">同步到云端</span>
          "，给一个密码 → 整库 zip 加密上传，服务端只能拿到密文 + 你写的 summary（≤500 字符）。 上限{' '}
          {Math.round(RESUME_SYNC_BLOB_MAX_SIZE_BYTES / 1024 / 1024)} MB，含照片场景够用。
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 加密版（推荐）· 当前</p>
      <h2 className="mt-2 text-[18px] font-extrabold text-ink">
        密文{' '}
        <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{formatSize(active.sizeBytes)}</span>
      </h2>
      <p className="mt-2 break-words text-[14px] text-ink-soft">{active.summary || <em>（无 summary）</em>}</p>
      <p className="mt-2 text-[14px] text-ink-soft">
        最后同步：<span className="font-mono">{formatTimestamp(active.updatedAt)}</span>
      </p>
      <p className="mt-1 break-all font-mono text-[12px] text-mute">blob {active.blobId.slice(0, 16)}…</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`/api/resume/sync/blob/${active.blobId}/download`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-fluff px-4 py-2 text-[14px] font-bold text-ink shadow-[0_3px_0_0_var(--color-ink-line)] transition active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--color-ink-line)]"
        >
          下载 .zip 自己解密
        </a>
        <BlobWipeButton />
      </div>
    </section>
  );
}

function BlobHistoryList({
  items,
}: {
  items: Array<{ id: string; blobId: string; summary: string; sizeBytes: number; archivedAt: number }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 加密版 · 历史</p>
        <h2 className="mt-2 text-[16px] font-extrabold text-ink">最近 {RESUME_SYNC_HISTORY_KEEP} 份归档</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          每次上传之前，当前版本会被搬到这里；超出保留份数的旧版会自动连密文一起清理。
        </p>
      </header>

      <ul className="mt-5 divide-y divide-rule">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-ink">密文 {formatSize(item.sizeBytes)}</p>
              <p className="mt-0.5 break-words text-[12px] text-ink-soft">{item.summary || <em>（无 summary）</em>}</p>
              <p className="font-mono text-[12px] text-mute">
                {formatTimestamp(item.archivedAt)} · blob {item.blobId.slice(0, 12)}…
              </p>
            </div>
            <BlobHistoryRowActions id={item.id} blobId={item.blobId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActiveCard({
  active,
}: {
  active: { hash: string; sizeBytes: number; fileCount: number; updatedAt: number } | null;
}) {
  if (!active) {
    return (
      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— 明文版</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">还没有明文快照</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          回 muicv-sync "
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">不要密码</span>"
          走明文路径——服务端按文件存，dashboard 能看文件列表 / 历史 diff，仅支持 .md， 单库上限{' '}
          {Math.round(RESUME_SYNC_MAX_SIZE_BYTES / 1024 / 1024)} MB。带照片请走加密版。
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 明文版 · 当前</p>
      <h2 className="mt-2 text-[18px] font-extrabold text-ink">
        云端 <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{active.fileCount}</span> 个文件 ·{' '}
        <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{formatSize(active.sizeBytes)}</span>
      </h2>
      <p className="mt-2 text-[14px] text-ink-soft">
        最后同步：<span className="font-mono">{formatTimestamp(active.updatedAt)}</span>
      </p>
      <p className="mt-1 break-all font-mono text-[12px] text-mute">指纹 {active.hash.slice(0, 16)}…</p>
      <div className="mt-5">
        <WipeButton />
      </div>
    </section>
  );
}

function SkillHints() {
  return (
    <section className="rounded-xl border-2 border-ink bg-paper p-6">
      <h2 className="text-[16px] font-extrabold text-ink">在 muicv-sync 技能里怎么用</h2>
      <ol className="mt-3 space-y-2 text-[14px] leading-[1.7] text-ink-soft">
        <li>
          🐾 <span className="font-bold text-ink">上传到云端</span>：跟 muicv-sync 说"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">同步到云端</span>
          "，技能会扫描素材、问你要不要密码——给密码走加密路径，不给密码走明文路径。
        </li>
        <li>
          🐾 <span className="font-bold text-ink">从云端下载</span>：换一台新机器，告诉 muicv-sync"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">从云端恢复素材</span>
          "，加密版需要再输一次密码；本地有冲突的文件先备份到 <code className="font-mono">.muicv-pull-backup-*</code>
          ，再写入云端版本。
        </li>
        <li>
          🐾 <span className="font-bold text-ink">前提</span>：本地要配好{' '}
          <code className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">MUICV_API_KEY</code>
          （在「桌面应用凭证」页生成，写到终端配置文件里），技能才能用令牌鉴权。
        </li>
      </ol>
    </section>
  );
}

function HistoryList({
  items,
}: {
  items: Array<{ id: string; hash: string; sizeBytes: number; fileCount: number; archivedAt: number }>;
}) {
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 明文版 · 历史</p>
        <h2 className="mt-2 text-[16px] font-extrabold text-ink">最近 {RESUME_SYNC_HISTORY_KEEP} 份归档</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          每次上传之前，当前版本会被搬到这里；超出保留份数的旧版会自动清理。
        </p>
      </header>

      {items.length === 0 ? (
        <p className="mt-5 text-[12px] text-mute">还没有历史快照。</p>
      ) : (
        <ul className="mt-5 divide-y divide-rule">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink">
                  {item.fileCount} 个文件 · {formatSize(item.sizeBytes)}
                </p>
                <p className="font-mono text-[12px] text-mute">
                  {formatTimestamp(item.archivedAt)} · 指纹 {item.hash.slice(0, 12)}…
                </p>
              </div>
              <HistoryRowActions id={item.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
