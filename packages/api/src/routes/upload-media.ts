import type { Context } from 'hono';

import type { AppEnv } from '../middleware/api-key.ts';

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const PDF_MIMES = new Set(['application/pdf']);
const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/ogg',
]);
const DOCUMENT_MIMES = new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const TEXT_MIMES = new Set(['text/plain', 'text/markdown']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
};

const EXT_BY_NAME: Record<string, { mime: string; kind: MediaKind }> = {
  jpg: { mime: 'image/jpeg', kind: 'image' },
  jpeg: { mime: 'image/jpeg', kind: 'image' },
  png: { mime: 'image/png', kind: 'image' },
  webp: { mime: 'image/webp', kind: 'image' },
  gif: { mime: 'image/gif', kind: 'image' },
  pdf: { mime: 'application/pdf', kind: 'pdf' },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'document',
  },
  md: { mime: 'text/markdown', kind: 'text' },
  markdown: { mime: 'text/markdown', kind: 'text' },
  txt: { mime: 'text/plain', kind: 'text' },
  mp3: { mime: 'audio/mpeg', kind: 'audio' },
  wav: { mime: 'audio/wav', kind: 'audio' },
  flac: { mime: 'audio/flac', kind: 'audio' },
  m4a: { mime: 'audio/mp4', kind: 'audio' },
  ogg: { mime: 'audio/ogg', kind: 'audio' },
};

type MediaKind = 'image' | 'pdf' | 'audio' | 'document' | 'text';

type UploadedMediaRow = {
  id: number;
  r2Key: string;
  url: string;
  kind: MediaKind;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: number;
};

type StoredObjectRow = {
  r2Key: string;
};

function publicMediaUrl(env: CloudflareBindings, key: string): string {
  const base = env.PHOTOS_PUBLIC_BASE_URL || 'https://i.muicv.com';
  return `${base.replace(/\/$/, '')}/${key}`;
}

function classifyMedia(file: File): { kind: MediaKind; mime: string; ext: string } | null {
  const mime = file.type.toLowerCase();
  const byMime = classifyMime(mime);
  if (byMime) return { ...byMime, ext: EXT_BY_MIME[mime] ?? 'bin' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byName = EXT_BY_NAME[ext];
  if (!byName) return null;
  return { kind: byName.kind, mime: byName.mime, ext: ext === 'jpeg' ? 'jpg' : ext };
}

function classifyMime(mime: string): { kind: MediaKind; mime: string } | null {
  if (IMAGE_MIMES.has(mime)) return { kind: 'image', mime };
  if (PDF_MIMES.has(mime)) return { kind: 'pdf', mime };
  if (AUDIO_MIMES.has(mime)) return { kind: 'audio', mime };
  if (DOCUMENT_MIMES.has(mime)) return { kind: 'document', mime };
  if (TEXT_MIMES.has(mime)) return { kind: 'text', mime };
  return null;
}

/**
 * POST /upload/media —— 聊天附件通用上传。
 *
 * 复用现有 MUICV_PHOTOS R2 bucket，但 key 放到 `<userId>/media/` 命名空间，
 * 避免和证件照 `<userId>/<uuid>.<ext>` 混在一起。返回 URL 给本地对话记录引用；
 * 对话内容本身不上传。
 */
export async function handleUploadMedia(c: Context<AppEnv>): Promise<Response> {
  const contentType = c.req.header('content-type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return c.json({ error: 'Content-Type 必须是 multipart/form-data' }, 400);
  }

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: '请求体解析失败' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: '字段 `file` 缺失或不是文件' }, 400);
  }
  if (file.size === 0) {
    return c.json({ error: '文件是空的' }, 400);
  }
  if (file.size > MAX_SIZE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return c.json({ error: `单文件不超过 20MB（当前 ${mb}MB）` }, 400);
  }

  const classified = classifyMedia(file);
  if (!classified) {
    return c.json({ error: `不支持的文件类型（收到 ${file.type || '未知'}）` }, 400);
  }

  const userId = c.get('userId') as string;
  const key = `${userId}/media/${crypto.randomUUID()}.${classified.ext}`;
  const originalName = file.name.slice(0, 200);
  const buf = await file.arrayBuffer();

  await c.env.MUICV_PHOTOS.put(key, buf, {
    httpMetadata: {
      contentType: classified.mime,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: { userId, originalName, kind: classified.kind },
  });

  const url = publicMediaUrl(c.env, key);
  const createdAt = Date.now();
  let mediaId: number | null = null;
  try {
    const result = await c.env.MUICV_API_DB.prepare(
      `INSERT INTO mediaUpload (userId, r2Key, url, kind, contentType, sizeBytes, originalName, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(userId, key, url, classified.kind, classified.mime, file.size, originalName, createdAt)
      .first<{ id: number }>();
    mediaId = result?.id ?? null;
  } catch (error) {
    console.error('mediaUpload audit insert failed', { key, userId, error });
  }

  return c.json(
    {
      id: mediaId,
      url,
      key,
      kind: classified.kind,
      contentType: classified.mime,
      size: file.size,
      createdAt,
    },
    201,
  );
}

export async function handleMediaHistory(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId') as string;
  try {
    const result = await c.env.MUICV_API_DB.prepare(
      `SELECT id, r2Key, url, kind, contentType, sizeBytes, originalName, createdAt
       FROM mediaUpload WHERE userId = ? ORDER BY createdAt DESC LIMIT 100`,
    )
      .bind(userId)
      .all<UploadedMediaRow>();
    return c.json({ items: result.results ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('handleMediaHistory failed', { userId, message });
    return c.json(
      {
        error: `读取媒体上传历史失败：${message}`,
        hint: 'D1 binding 或 mediaUpload 表可能未就绪（看 migration 0016）',
      },
      500,
    );
  }
}

/**
 * DELETE /upload/media —— 删除当前用户所有云端媒体。
 *
 * 范围包含新通用 mediaUpload，也包含旧 photoUpload，符合设置页“一键删除图片、PDF、音频等”
 * 的用户预期。只删 R2 与 D1 审计行，不动本机 inbox/ 和本地对话文件。
 */
export async function handleDeleteAllMedia(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId') as string;
  let mediaRows: { results?: StoredObjectRow[] };
  let photoRows: { results?: StoredObjectRow[] };
  try {
    [mediaRows, photoRows] = await Promise.all([
      c.env.MUICV_API_DB.prepare('SELECT r2Key FROM mediaUpload WHERE userId = ?').bind(userId).all<StoredObjectRow>(),
      c.env.MUICV_API_DB.prepare('SELECT r2Key FROM photoUpload WHERE userId = ?').bind(userId).all<StoredObjectRow>(),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('handleDeleteAllMedia list failed', { userId, message });
    return c.json(
      {
        error: `读取云端媒体清单失败：${message}`,
        hint: 'D1 binding 或 mediaUpload 表可能未就绪（看 migration 0016）',
      },
      500,
    );
  }

  const keys = [...(mediaRows.results ?? []), ...(photoRows.results ?? [])].map((row) => row.r2Key);
  // R2 delete 支持一次传 key 数组（上限 1000/次）：比逐个 await 省 subrequest，
  // 附件多时不至于把 Worker 拖到超时 / CPU 上限。delete 对不存在的 key 幂等，不会抛。
  const R2_DELETE_BATCH = 1000;
  try {
    for (let i = 0; i < keys.length; i += R2_DELETE_BATCH) {
      await c.env.MUICV_PHOTOS.delete(keys.slice(i, i + R2_DELETE_BATCH));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('delete media objects failed', { userId, count: keys.length, message });
    return c.json({ error: `R2 对象删除失败：${message}` }, 500);
  }
  const deletedObjects = keys.length;

  try {
    await Promise.all([
      c.env.MUICV_API_DB.prepare('DELETE FROM mediaUpload WHERE userId = ?').bind(userId).run(),
      c.env.MUICV_API_DB.prepare('DELETE FROM photoUpload WHERE userId = ?').bind(userId).run(),
    ]);
  } catch (err) {
    // R2 已删成功但审计行没清掉：物理对象已没了，下次重试这些 key 会 404（R2 delete 幂等），
    // 不阻断用户，但要 surface 真实错误便于排查。
    const message = err instanceof Error ? err.message : String(err);
    console.error('handleDeleteAllMedia purge audit failed', { userId, message });
    return c.json(
      {
        error: `已删除云端文件，但清理审计记录失败：${message}`,
        hint: 'D1 binding 或 mediaUpload 表可能未就绪（看 migration 0016）',
      },
      500,
    );
  }

  return c.json({
    ok: true,
    deletedMedia: mediaRows.results?.length ?? 0,
    deletedPhotos: photoRows.results?.length ?? 0,
    deletedObjects,
  });
}
