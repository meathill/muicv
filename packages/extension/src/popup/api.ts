import {
  DEFAULT_MUICV_API_BASE,
  type JobSubmitAccepted,
  type JobSubmitRequest,
  type JobSubmitResponse,
  type JobSubmitStatus,
} from '@muicv/shared';

import { t } from '../i18n.ts';

/** 扩展直连 muicv API，凭用户自己的 API key（存在 chrome.storage.local，仅本机）。 */

export type Settings = { apiKey: string; apiBase: string };

const KEY = 'muicvSettings';
export const API_KEY_PATTERN = /^mui_[A-Za-z0-9]{32}$/;

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined;
  return { apiKey: stored?.apiKey ?? '', apiBase: stored?.apiBase || DEFAULT_MUICV_API_BASE };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings });
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function errorMessage(status: number): string {
  if (status === 401) return t('errKey');
  if (status === 402) return t('errBalance');
  if (status === 429) return t('errRate');
  return t('errRequest', status);
}

async function request<T>(
  settings: Settings,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${settings.apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${settings.apiKey}`, ...init.headers },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(errorMessage(res.status), res.status);
  return { status: res.status, body: body as T };
}

export async function fetchMe(settings: Settings): Promise<{ name: string; balance: number }> {
  return (await request<{ name: string; balance: number }>(settings, '/me')).body;
}

export type SubmitOutcome = { kind: 'done'; result: JobSubmitResponse } | { kind: 'queued'; id: string };

/** 200 = 同步完成（确定性识别）；202 = 已入队，之后轮询 getSubmission。 */
export async function submitJobs(settings: Settings, payload: JobSubmitRequest): Promise<SubmitOutcome> {
  const res = await request<JobSubmitResponse | JobSubmitAccepted>(settings, '/jobs/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.status === 202) return { kind: 'queued', id: (res.body as JobSubmitAccepted).id };
  return { kind: 'done', result: res.body as JobSubmitResponse };
}

export async function getSubmission(settings: Settings, id: string): Promise<JobSubmitStatus> {
  return (await request<JobSubmitStatus>(settings, `/jobs/submit/${encodeURIComponent(id)}`)).body;
}
