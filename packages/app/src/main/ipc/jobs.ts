import { type JobKind, type JobSearchRequest, searchJobs } from '@muicv/shared';
import { ipcMain } from 'electron';

import type { JobDetailResult, JobImportResult, JobSearchResult } from '../../shared/types.ts';
import { importJobById, loadJobDetail } from '../job-import.ts';
import { getConfig } from '../store.ts';

/**
 * 岗位搜索面板 IPC。网络请求放 main：renderer 不直连 api（CSP / CORS），也方便带 API key。
 */

function isKind(value: unknown): value is JobKind {
  return value === 'collected' || value === 'community';
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runJobSearch(req: JobSearchRequest, fetchImpl: typeof fetch = fetch): Promise<JobSearchResult> {
  const cfg = getConfig();
  try {
    const data = await searchJobs(req, {
      baseUrl: cfg.muicvApiBase,
      ...(cfg.muicvApiKey ? { apiKey: cfg.muicvApiKey } : {}),
      fetchImpl,
    });
    return { ok: true, data };
  } catch (error) {
    const status =
      typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 0;
    return { ok: false, status, error: message(error) };
  }
}

export function registerJobsIpc(): void {
  ipcMain.handle('jobs:search', (_e, req: JobSearchRequest) => runJobSearch(req));

  ipcMain.handle('jobs:detail', async (_e, kind: unknown, id: string): Promise<JobDetailResult> => {
    if (!isKind(kind)) return { ok: false, error: 'invalid-kind' };
    try {
      const captured = await loadJobDetail(kind, id);
      return captured ? { ok: true, markdown: captured.markdown } : { ok: false, error: 'job-not-found' };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  });

  ipcMain.handle('jobs:import', async (_e, kind: unknown, id: string): Promise<JobImportResult> => {
    if (!isKind(kind)) return { ok: false, error: 'invalid-kind' };
    try {
      return { ok: true, ...(await importJobById(kind, id)) };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  });
}
