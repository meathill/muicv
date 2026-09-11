import {
  hashResumeFiles,
  RESUME_SYNC_HISTORY_KEEP,
  type ResumeSyncPayload,
  validateResumeSyncPayload,
} from '@muicv/shared';
import type { Context } from 'hono';

import { readJsonBody } from '../lib/json-body.ts';
import type { AppEnv } from '../middleware/api-key.ts';

type ActiveSnapshotRow = {
  files: string;
  hash: string;
  sizeBytes: number;
  fileCount: number;
  updatedAt: number;
};

type HistoryRow = ActiveSnapshotRow & { id: string; archivedAt: number };

/**
 * POST /resume/sync —— skill push 整个素材库到云端。
 *
 * 流程：
 *   1. 校验 body（路径合法 / 大小 / 文件数）
 *   2. 取当前活动版，归档到 history
 *   3. upsert 活动版
 *   4. 异步修剪 history（保留 RESUME_SYNC_HISTORY_KEEP 份）
 *
 * 步骤 2+3 走 D1 batch 原子提交；步骤 4 落空也无所谓，下次 push 还会执行。
 */
export async function handleResumeSync(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const parsed = await readJsonBody<unknown>(c);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const validation = validateResumeSyncPayload(body);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }

  const files = (body as ResumeSyncPayload).files;
  const filesJson = JSON.stringify(files);
  const hash = await hashResumeFiles(files);
  const now = Date.now();
  const { sizeBytes, fileCount } = validation;

  const db = c.env.MUICV_API_DB;
  const active = await db
    .prepare('SELECT files, hash, sizeBytes, fileCount, updatedAt FROM resumeSnapshot WHERE userId = ?')
    .bind(userId)
    .first<ActiveSnapshotRow>();

  const stmts = [] as ReturnType<typeof db.prepare>[];
  if (active) {
    stmts.push(
      db
        .prepare(
          'INSERT INTO resumeSnapshotHistory (id, userId, files, hash, sizeBytes, fileCount, archivedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          crypto.randomUUID(),
          userId,
          active.files,
          active.hash,
          active.sizeBytes,
          active.fileCount,
          active.updatedAt,
        ),
    );
  }
  stmts.push(
    db
      .prepare(
        `INSERT INTO resumeSnapshot (userId, files, hash, sizeBytes, fileCount, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId) DO UPDATE SET
           files=excluded.files,
           hash=excluded.hash,
           sizeBytes=excluded.sizeBytes,
           fileCount=excluded.fileCount,
           updatedAt=excluded.updatedAt`,
      )
      .bind(userId, filesJson, hash, sizeBytes, fileCount, now),
  );

  await db.batch(stmts);

  c.executionCtx.waitUntil(
    db
      .prepare(
        `DELETE FROM resumeSnapshotHistory
         WHERE userId = ?
           AND id NOT IN (
             SELECT id FROM resumeSnapshotHistory
             WHERE userId = ?
             ORDER BY archivedAt DESC
             LIMIT ?
           )`,
      )
      .bind(userId, userId, RESUME_SYNC_HISTORY_KEEP)
      .run()
      .catch(() => {}),
  );

  return c.json({ hash, sizeBytes, fileCount, updatedAt: now });
}

/** GET /resume/snapshot —— 拉活动版（含 files） */
export async function handleResumeSnapshotGet(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const row = await c.env.MUICV_API_DB.prepare(
    'SELECT files, hash, sizeBytes, fileCount, updatedAt FROM resumeSnapshot WHERE userId = ?',
  )
    .bind(userId)
    .first<ActiveSnapshotRow>();

  if (!row) {
    return c.json({ error: 'no-snapshot', message: '云端没有这个用户的素材快照' }, 404);
  }

  return c.json({
    files: JSON.parse(row.files),
    hash: row.hash,
    sizeBytes: row.sizeBytes,
    fileCount: row.fileCount,
    updatedAt: row.updatedAt,
  });
}

/** GET /resume/snapshot/history —— 列出历史快照（仅 metadata，不含 files） */
export async function handleResumeHistoryList(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const result = await c.env.MUICV_API_DB.prepare(
    `SELECT id, hash, sizeBytes, fileCount, archivedAt
       FROM resumeSnapshotHistory
       WHERE userId = ?
       ORDER BY archivedAt DESC`,
  )
    .bind(userId)
    .all<Omit<HistoryRow, 'files' | 'updatedAt'>>();

  return c.json({ items: result.results ?? [] });
}

/** GET /resume/snapshot/history/:id —— 拉某个历史版本（含 files） */
export async function handleResumeHistoryGet(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const id = c.req.param('id');
  const row = await c.env.MUICV_API_DB.prepare(
    'SELECT id, files, hash, sizeBytes, fileCount, archivedAt FROM resumeSnapshotHistory WHERE id = ? AND userId = ?',
  )
    .bind(id, userId)
    .first<HistoryRow>();

  if (!row) {
    return c.json({ error: 'not-found' }, 404);
  }

  return c.json({
    id: row.id,
    files: JSON.parse(row.files),
    hash: row.hash,
    sizeBytes: row.sizeBytes,
    fileCount: row.fileCount,
    archivedAt: row.archivedAt,
  });
}

/** DELETE /resume/snapshot —— 清空云端快照（活动版 + 全部历史） */
export async function handleResumeSnapshotDelete(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId');
  if (!userId) return c.json({ error: 'unauthorized' }, 401);

  const db = c.env.MUICV_API_DB;
  await db.batch([
    db.prepare('DELETE FROM resumeSnapshot WHERE userId = ?').bind(userId),
    db.prepare('DELETE FROM resumeSnapshotHistory WHERE userId = ?').bind(userId),
  ]);

  return c.json({ ok: true });
}
