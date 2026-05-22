import { app } from 'electron';

import type { AppConfig, AttachmentSaveResult, AttachmentUploadInput } from '../shared/types.ts';
import { uploadMedia } from './api-preview.ts';
import { saveAttachment } from './attachments.ts';

function debugInfo(message: string, payload?: Record<string, unknown>): void {
  if (!app.isPackaged) console.info(message, payload ?? '');
}

function debugWarn(message: string, payload?: Record<string, unknown>): void {
  if (!app.isPackaged) console.warn(message, payload ?? '');
}

export async function saveAttachmentWithRemote(
  config: AppConfig,
  input: AttachmentUploadInput,
): Promise<AttachmentSaveResult> {
  const saved = await saveAttachment(config.workspaceDir, input);
  if (!saved.ok) return saved;
  if (!config.muicvApiKey) {
    debugWarn('[attachment remote] skipped: no muicv API key');
    return saved;
  }

  const bytes = new Uint8Array(input.bytes);
  debugInfo('[attachment remote] uploading', {
    name: saved.ref.name,
    mimeType: saved.ref.mimeType,
    size: saved.ref.size,
    apiBase: config.muicvApiBase,
  });
  const uploaded = await uploadMedia(config, {
    name: saved.ref.name,
    mimeType: saved.ref.mimeType,
    bytes,
  });

  if (!uploaded.ok) {
    debugWarn('[attachment remote] upload failed', {
      name: saved.ref.name,
      status: uploaded.status,
      message: uploaded.message,
    });
    return saved;
  }

  debugInfo('[attachment remote] uploaded', {
    name: saved.ref.name,
    url: uploaded.url,
    r2Key: uploaded.key,
  });
  return {
    ok: true,
    ref: {
      ...saved.ref,
      url: uploaded.url,
      r2Key: uploaded.key,
      ...(uploaded.id === null ? {} : { mediaId: uploaded.id }),
    },
  };
}
