import { RESUME_SYNC_BLOB_MAX_SIZE_BYTES, RESUME_SYNC_HISTORY_KEEP, RESUME_SYNC_MAX_SIZE_BYTES } from '@muicv/shared';
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { getResumeBlobSyncStatus, getResumeSyncStatus } from '@/lib/resume-sync';

import { BlobHistoryRowActions, BlobWipeButton, HistoryRowActions, WipeButton } from './sync-actions';

export const metadata: Metadata = {
  title: 'Cloud sync',
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Cloud sync</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          MuiCV cloud sync
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Use the muicv-sync skill to upload the materials in your working directory to the cloud, then download them on
          a new machine. Two modes:
          <strong>Encrypted</strong>(recommended) — zipped and encrypted on your machine; the server only sees
          ciphertext.
          <strong>Plain</strong> — stored file by file so the dashboard can list them; .md only. Each mode keeps the
          current version plus the latest {RESUME_SYNC_HISTORY_KEEP} history snapshots.
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— Encrypted (recommended)</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">No encrypted snapshot yet</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Tell muicv-sync"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">
            sync to the cloud
          </span>
          "and give it a password; the whole library is zipped, encrypted and uploaded. The server only gets the
          ciphertext plus your summary (≤500 chars). Limit {Math.round(RESUME_SYNC_BLOB_MAX_SIZE_BYTES / 1024 / 1024)}{' '}
          MB, enough to include photos.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
        — Encrypted (recommended) · current
      </p>
      <h2 className="mt-2 text-[18px] font-extrabold text-ink">
        ciphertext{' '}
        <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{formatSize(active.sizeBytes)}</span>
      </h2>
      <p className="mt-2 break-words text-[14px] text-ink-soft">{active.summary || <em>(no summary)</em>}</p>
      <p className="mt-2 text-[14px] text-ink-soft">
        Last synced:<span className="font-mono">{formatTimestamp(active.updatedAt)}</span>
      </p>
      <p className="mt-1 break-all font-mono text-[12px] text-mute">blob {active.blobId.slice(0, 16)}…</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`/api/resume/sync/blob/${active.blobId}/download`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-fluff px-4 py-2 text-[14px] font-bold text-ink shadow-[0_3px_0_0_var(--color-ink-line)] transition active:translate-y-[2px] active:shadow-[0_1px_0_0_var(--color-ink-line)]"
        >
          Download .zip and decrypt yourself
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Encrypted · history</p>
        <h2 className="mt-2 text-[16px] font-extrabold text-ink">Latest {RESUME_SYNC_HISTORY_KEEP} archived</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Before each upload the current version moves here; older versions beyond the limit are deleted along with
          their ciphertext.
        </p>
      </header>

      <ul className="mt-5 divide-y divide-rule">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-ink">ciphertext {formatSize(item.sizeBytes)}</p>
              <p className="mt-0.5 break-words text-[12px] text-ink-soft">{item.summary || <em>(no summary)</em>}</p>
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— Plain</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">No plain snapshot yet</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          Answer muicv-sync with "
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">no password</span>" to
          use plain mode — stored file by file, with file lists and history in the dashboard; .md only. Library limit{' '}
          {Math.round(RESUME_SYNC_MAX_SIZE_BYTES / 1024 / 1024)} MB. Use encrypted mode for photos.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Plain · current</p>
      <h2 className="mt-2 text-[18px] font-extrabold text-ink">
        Cloud <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{active.fileCount}</span> files ·{' '}
        <span className="rounded-md bg-fluff px-2 py-0.5 font-mono tabular-nums">{formatSize(active.sizeBytes)}</span>
      </h2>
      <p className="mt-2 text-[14px] text-ink-soft">
        Last synced:<span className="font-mono">{formatTimestamp(active.updatedAt)}</span>
      </p>
      <p className="mt-1 break-all font-mono text-[12px] text-mute">fingerprint {active.hash.slice(0, 16)}…</p>
      <div className="mt-5">
        <WipeButton />
      </div>
    </section>
  );
}

function SkillHints() {
  return (
    <section className="rounded-xl border-2 border-ink bg-paper p-6">
      <h2 className="text-[16px] font-extrabold text-ink">How to use the muicv-sync skill</h2>
      <ol className="mt-3 space-y-2 text-[14px] leading-[1.7] text-ink-soft">
        <li>
          🐾 <span className="font-bold text-ink">Upload</span>: tell muicv-sync"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">
            sync to the cloud
          </span>
          "; the skill scans your materials and asks for a password — with one it uses encrypted mode, without one plain
          mode.
        </li>
        <li>
          🐾 <span className="font-bold text-ink">Download</span>: on a new machine, tell muicv-sync"
          <span className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">
            restore my materials from the cloud
          </span>
          "; encrypted backups need the password again. Conflicting local files are backed up to{' '}
          <code className="font-mono">.muicv-pull-backup-*</code>
          before the cloud version is written.
        </li>
        <li>
          🐾 <span className="font-bold text-ink">Prerequisite</span>: set{' '}
          <code className="rounded bg-fluff px-1.5 py-0.5 font-mono text-[12px] text-yellow-deep">MUICV_API_KEY</code>
          locally (generate it on the Desktop app keys page and add it to your shell config) so the skill can
          authenticate.
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Plain · history</p>
        <h2 className="mt-2 text-[16px] font-extrabold text-ink">Latest {RESUME_SYNC_HISTORY_KEEP} archived</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          Before each upload the current version moves here; older versions beyond the limit are deleted automatically.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="mt-5 text-[12px] text-mute">No history snapshots yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-rule">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-ink">
                  {item.fileCount} files · {formatSize(item.sizeBytes)}
                </p>
                <p className="font-mono text-[12px] text-mute">
                  {formatTimestamp(item.archivedAt)} · fingerprint {item.hash.slice(0, 12)}…
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
  return new Date(ms).toLocaleString('en-US', {
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
