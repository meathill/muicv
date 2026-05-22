/**
 * muicv 后端 API 封装：在线预览 + 证件照上传。
 *
 * 主进程持有 muicvApiKey 和 muicvApiBase，渲染进程通过 IPC 调这里。
 * 失败统一返回 `{ ok: false, status, message }`，让 UI 渲染清晰的错误。
 *
 * 风格跟 src/main/agent/api-tools.ts 一致：不抛错，所有失败都映射成结构化结果，
 * renderer 拿到 `{ ok: false }` 直接展示 message 即可。
 */

import type { TemplateLang, TemplateResumeData } from '@muicv/shared';

import type { AppConfig } from '../shared/types.ts';

export type ApiFailure = { ok: false; status: number; message: string };

export type PhotoUploadInput = {
  /** 客户端原始文件名（截到 200 字符存到审计行 originalName 字段）。 */
  name: string;
  /** image/jpeg | image/png | image/webp。 */
  mimeType: string;
  /** 原始字节，由 renderer 通过 IPC 传过来。 */
  bytes: Uint8Array;
};

export type PhotoUploadOk = {
  ok: true;
  url: string;
  key: string;
  contentType: string;
  size: number;
  createdAt: number;
};

export type PhotoUploadResult = PhotoUploadOk | ApiFailure;

export type PhotoHistoryItem = {
  id: number;
  r2Key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  originalName: string | null;
  createdAt: number;
};

export type PhotoHistoryResult = { ok: true; items: PhotoHistoryItem[] } | ApiFailure;

export type MediaUploadInput = {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type MediaUploadOk = {
  ok: true;
  id: number | null;
  url: string;
  key: string;
  kind: 'image' | 'pdf' | 'audio' | 'document' | 'text';
  contentType: string;
  size: number;
  createdAt: number;
};

export type MediaUploadResult = MediaUploadOk | ApiFailure;

export type MediaDeleteAllOk = {
  ok: true;
  deletedMedia: number;
  deletedPhotos: number;
  deletedObjects: number;
};

export type MediaDeleteAllResult = MediaDeleteAllOk | ApiFailure;

export type CreatePreviewInput = {
  resumeJson: TemplateResumeData;
  /** t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic */
  template: string;
  lang?: TemplateLang;
  accent?: string;
  shareMode?: 'link' | 'public';
  ttlDays?: 1 | 7 | 30;
};

export type CreatePreviewOk = {
  ok: true;
  token: string;
  url: string;
  template: string;
  lang: TemplateLang;
  shareMode: 'link' | 'public';
  expiresAt: number;
};

export type CreatePreviewResult = CreatePreviewOk | ApiFailure;

function requireKey(config: AppConfig): ApiFailure | null {
  if (!config.muicvApiKey) {
    return {
      ok: false,
      status: 401,
      message: '还没配置 muicv API key。打开「设置 → 桌面应用凭证」连接账号后再试。',
    };
  }
  return null;
}

function authHeaders(config: AppConfig): Record<string, string> {
  return { authorization: `Bearer ${config.muicvApiKey ?? ''}` };
}

function apiUrl(config: AppConfig, path: string): string {
  return `${config.muicvApiBase.replace(/\/$/, '')}${path}`;
}

function networkFailure(err: unknown): ApiFailure {
  return {
    ok: false,
    status: 0,
    message: `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`,
  };
}

async function nonOkFailure(res: Response): Promise<ApiFailure> {
  // 优先把后端的 error.message 拿出来给用户看；非 JSON 时用文本前 200 字符。
  const text = await res.text().catch(() => '');
  let message = '';
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string; detail?: string };
    message = parsed.message ?? parsed.error ?? parsed.detail ?? '';
  } catch {
    message = text.slice(0, 200);
  }
  return { ok: false, status: res.status, message: message || `muicv API 返回 ${res.status}` };
}

/**
 * 上传证件照到 R2。
 *
 * renderer 把 ArrayBuffer 经 IPC 序列化传过来（Electron 会把 Uint8Array 拷一份给 main），
 * main 转 Blob 拼 multipart/form-data。content-type 由 fetch 自动加 boundary。
 */
export async function uploadPhoto(config: AppConfig, input: PhotoUploadInput): Promise<PhotoUploadResult> {
  const denied = requireKey(config);
  if (denied) return denied;

  const fd = new FormData();
  // Node 24 TS lib：Uint8Array.buffer 是 ArrayBufferLike，可能是 SharedArrayBuffer。
  // 拿底层 buffer 切一份 ArrayBuffer 给 Blob，规避 lib.dom 的 BlobPart 类型不兼容。
  const arrayBuffer = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: input.mimeType });
  fd.append('file', blob, input.name);

  let res: Response;
  try {
    res = await fetch(apiUrl(config, '/upload/photo'), {
      method: 'POST',
      headers: authHeaders(config),
      body: fd,
    });
  } catch (err) {
    return networkFailure(err);
  }
  if (!res.ok) return nonOkFailure(res);
  const body = (await res.json()) as PhotoUploadOk;
  return { ...body, ok: true };
}

export async function listPhotos(config: AppConfig, limit = 20): Promise<PhotoHistoryResult> {
  const denied = requireKey(config);
  if (denied) return denied;
  const url = new URL(apiUrl(config, '/upload/photo/history'));
  url.searchParams.set('limit', String(limit));
  let res: Response;
  try {
    res = await fetch(url, { headers: authHeaders(config) });
  } catch (err) {
    return networkFailure(err);
  }
  if (!res.ok) return nonOkFailure(res);
  const body = (await res.json()) as { items: PhotoHistoryItem[] };
  return { ok: true, items: body.items ?? [] };
}

export async function uploadMedia(config: AppConfig, input: MediaUploadInput): Promise<MediaUploadResult> {
  const denied = requireKey(config);
  if (denied) return denied;

  const fd = new FormData();
  const arrayBuffer = input.bytes.buffer.slice(
    input.bytes.byteOffset,
    input.bytes.byteOffset + input.bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: input.mimeType });
  fd.append('file', blob, input.name);

  let res: Response;
  try {
    res = await fetch(apiUrl(config, '/upload/media'), {
      method: 'POST',
      headers: authHeaders(config),
      body: fd,
    });
  } catch (err) {
    return networkFailure(err);
  }
  if (!res.ok) return nonOkFailure(res);
  const body = (await res.json()) as MediaUploadOk;
  return { ...body, ok: true };
}

export async function deleteAllMedia(config: AppConfig): Promise<MediaDeleteAllResult> {
  const denied = requireKey(config);
  if (denied) return denied;

  let res: Response;
  try {
    res = await fetch(apiUrl(config, '/upload/media'), {
      method: 'DELETE',
      headers: authHeaders(config),
    });
  } catch (err) {
    return networkFailure(err);
  }
  if (!res.ok) return nonOkFailure(res);
  const body = (await res.json()) as MediaDeleteAllOk;
  return { ...body, ok: true };
}

export async function createPreview(config: AppConfig, input: CreatePreviewInput): Promise<CreatePreviewResult> {
  const denied = requireKey(config);
  if (denied) return denied;
  let res: Response;
  try {
    res = await fetch(apiUrl(config, '/preview'), {
      method: 'POST',
      headers: { ...authHeaders(config), 'content-type': 'application/json' },
      body: JSON.stringify({
        resumeJson: input.resumeJson,
        template: input.template,
        ...(input.lang ? { lang: input.lang } : {}),
        ...(input.accent ? { accent: input.accent } : {}),
        ...(input.shareMode ? { shareMode: input.shareMode } : {}),
        ...(input.ttlDays ? { ttlDays: input.ttlDays } : {}),
      }),
    });
  } catch (err) {
    return networkFailure(err);
  }
  if (!res.ok) return nonOkFailure(res);
  const body = (await res.json()) as CreatePreviewOk;
  return { ...body, ok: true };
}
