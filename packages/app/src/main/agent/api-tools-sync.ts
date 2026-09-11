import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { validateResumeSyncPayload } from '@muicv/shared';
import { tool } from '@openai/agents';
import { z } from 'zod';

import type { AppConfig } from '../../shared/types.ts';

/**
 * muicv 云同步工具：让 agent 能把工作目录的 .md 整体 push 到云端，或者从云端 pull 回来。
 *
 * 跟 muicv-sync skill 走同一对 endpoint（POST /resume/sync, GET /resume/snapshot），
 * 区别只是 client 这边的 muicvApiKey 是登录后 deep link 自动写入 store 的——用户无感。
 */

function authHeader(config: AppConfig): Record<string, string> {
  return config.muicvApiKey ? { authorization: `Bearer ${config.muicvApiKey}` } : {};
}

async function collectMarkdownFiles(workspaceDir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function walk(absDir: string): Promise<void> {
    const entries = await readdir(absDir, { withFileTypes: true });
    for (const entry of entries) {
      // 跳过隐藏目录（.git / .muicv-pull-backup-* / .DS_Store 等）和依赖目录
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rel = relative(workspaceDir, abs).split(sep).join('/');
        files[rel] = await readFile(abs, 'utf8');
      }
    }
  }
  await walk(workspaceDir);
  return files;
}

function timestampSuffix(): string {
  return new Date().toISOString().replace(/\..+/, '').replace(/[-:]/g, '').replace('T', '-');
}

export function buildSyncTools(config: AppConfig) {
  const syncToCloud = tool({
    name: 'sync_resume_to_cloud',
    description:
      '把工作目录下所有 .md 文件作为完整快照 push 到 muicv 云端。云端只保留一份活动版 + 5 份历史，旧版自动归档。完全免费。用户登录 muicv 后无需额外配置。',
    parameters: z.object({}),
    execute: async () => {
      if (!config.workspaceDir) return '工作目录未配置';
      if (!config.muicvApiKey) return '还没登录 muicv（设置里看 API key 是否有效）；登录后再试';

      let files: Record<string, string>;
      try {
        files = await collectMarkdownFiles(config.workspaceDir);
      } catch (err) {
        return `扫描工作目录失败：${err instanceof Error ? err.message : String(err)}`;
      }

      const validation = validateResumeSyncPayload({ files });
      if (!validation.ok) return `本地素材库不能 push：${validation.error}`;

      let res: Response;
      try {
        res = await fetch(`${config.muicvApiBase}/resume/sync`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader(config) },
          body: JSON.stringify({ files }),
        });
      } catch (err) {
        return `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return `muicv /resume/sync 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`;
      }

      const body = (await res.json().catch(() => ({}))) as {
        sizeBytes?: number;
        fileCount?: number;
      };
      const sizeKb = ((body.sizeBytes ?? validation.sizeBytes) / 1024).toFixed(1);
      return `已同步 ${body.fileCount ?? validation.fileCount} 个文件到云端（${sizeKb} KB）。在 muicv.com/dashboard/sync 看历史 / 回滚。`;
    },
  });

  const pullFromCloud = tool({
    name: 'pull_resume_from_cloud',
    description:
      '从 muicv 云端拉最新活动版到本地工作目录。本地有冲突的 .md 会先备份到 .muicv-pull-backup-<时间戳>/ 再被覆盖；本地多出来的文件不动。',
    parameters: z.object({}),
    execute: async () => {
      if (!config.workspaceDir) return '工作目录未配置';
      if (!config.muicvApiKey) return '还没登录 muicv（设置里看 API key 是否有效）；登录后再试';

      let res: Response;
      try {
        res = await fetch(`${config.muicvApiBase}/resume/snapshot`, {
          method: 'GET',
          headers: { accept: 'application/json', ...authHeader(config) },
        });
      } catch (err) {
        return `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`;
      }

      if (res.status === 404) return '云端还没有快照——先在另一台机器或本机 push 过才能 pull。';
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return `muicv /resume/snapshot 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`;
      }

      const body = (await res.json().catch(() => ({}))) as {
        files?: Record<string, string>;
        sizeBytes?: number;
        fileCount?: number;
      };
      const cloudFiles = body.files ?? {};
      const backupDir = `.muicv-pull-backup-${timestampSuffix()}`;
      const root = config.workspaceDir.endsWith(sep) ? config.workspaceDir : config.workspaceDir + sep;

      let backupCount = 0;
      let writtenCount = 0;
      for (const [relPath, content] of Object.entries(cloudFiles)) {
        const abs = resolve(config.workspaceDir, relPath);
        if (abs !== config.workspaceDir && !abs.startsWith(root)) continue;

        try {
          const existing = await readFile(abs, 'utf8');
          if (existing !== content) {
            const bakAbs = resolve(config.workspaceDir, backupDir, relPath);
            await mkdir(dirname(bakAbs), { recursive: true });
            await copyFile(abs, bakAbs);
            backupCount++;
          }
        } catch {
          // 本地不存在 → 新增，不需备份
        }

        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, content, 'utf8');
        writtenCount++;
      }

      const sizeKb = ((body.sizeBytes ?? 0) / 1024).toFixed(1);
      const parts = [`从云端拉取了 ${writtenCount} 个文件（${sizeKb} KB）`];
      if (backupCount > 0) parts.push(`${backupCount} 个本地版本已备份到 ${backupDir}/`);
      return `${parts.join('；')}。`;
    },
  });

  return [syncToCloud, pullFromCloud];
}
