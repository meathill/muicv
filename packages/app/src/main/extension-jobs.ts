import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  buildTargetMarkdown,
  type CapturedJd,
  DEFAULT_LLM_MODEL,
  type ExtensionJobState,
  type JdMatchResult,
  parseMatchJson,
  targetSlugFor,
} from '@muicv/shared';
import { BrowserWindow } from 'electron';
import fg from 'fast-glob';
import OpenAI from 'openai';

import type { ChatMessage } from '../shared/types.ts';
import { runAgent } from './agent/runtime.ts';
import { createConversation } from './conversations.ts';
import { getActiveProfile, getConfig } from './store.ts';

const jobs = new Map<string, JobRecord>();

type JobRecord = ExtensionJobState & {
  jd: CapturedJd;
};

const MATCH_SYSTEM = `你是求职匹配助手。根据用户本地职业素材摘要和岗位 JD，判断这位求职者是否值得投这份工作。
只依据给定素材，不编造经历。输出 JSON 对象，字段：
- verdict: "suitable" | "weak" | "poor"
- score: 0-100 整数
- covered: 素材明确覆盖的 JD 关键词数组
- gaps: JD 要求但素材没有的关键词数组
- reason: 不超过 80 字的中文理由
suitable = 核心要求大部分覆盖；weak = 能投但缺口明显；poor = 明显不匹配。`;

export function getJob(jobId: string): JobRecord | undefined {
  return jobs.get(jobId);
}

function notifyRenderer(channel: string, payload: unknown): void {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

async function uniqueRelPath(workspaceDir: string, relPath: string): Promise<string> {
  if (!existsSync(join(workspaceDir, relPath))) return relPath;
  const dot = relPath.lastIndexOf('.');
  const stem = dot > 0 ? relPath.slice(0, dot) : relPath;
  const ext = dot > 0 ? relPath.slice(dot) : '';
  for (let i = 2; i < 50; i++) {
    const candidate = `${stem}-${i}${ext}`;
    if (!existsSync(join(workspaceDir, candidate))) return candidate;
  }
  return `${stem}-${Date.now()}${ext}`;
}

export async function ingestCapturedJd(jd: CapturedJd): Promise<JobRecord> {
  const cfg = getConfig();
  if (!cfg.workspaceDir) {
    throw Object.assign(new Error('no-workspace'), { status: 409 });
  }
  const built = buildTargetMarkdown(jd);
  const relPath = await uniqueRelPath(cfg.workspaceDir, built.relPath);
  const abs = join(cfg.workspaceDir, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, built.content, 'utf8');

  const job: JobRecord = {
    jobId: randomUUID(),
    status: 'queued',
    targetPath: relPath,
    jd,
  };
  jobs.set(job.jobId, job);
  notifyRenderer('extension:job', { jobId: job.jobId, targetPath: relPath, title: jd.title, company: jd.company });
  void runMatchThenMaybeGenerate(job.jobId).catch((err) => {
    const rec = jobs.get(job.jobId);
    if (!rec) return;
    rec.status = 'error';
    rec.error = err instanceof Error ? err.message : String(err);
    notifyRenderer('extension:job', rec);
  });
  return job;
}

async function loadMaterialSummary(workspaceDir: string): Promise<string> {
  const profiles = await fg('**/profile.md', { cwd: workspaceDir, absolute: true, onlyFiles: true });
  const root = profiles[0] ? dirname(profiles[0]) : workspaceDir;
  const chunks: string[] = [];
  for (const rel of ['profile.md', 'skills.md', 'education.md', 'achievements.md']) {
    try {
      const text = await readFile(join(root, rel), 'utf8');
      chunks.push(`# ${rel}\n${text.slice(0, 3500)}`);
    } catch {
      /* 没有这份素材就跳过 */
    }
  }
  const listing = await fg('{experience,projects}/*.md', { cwd: root, onlyFiles: true });
  if (listing.length) chunks.push(`# 经历/项目文件\n${listing.join('\n')}`);
  return chunks.join('\n\n').slice(0, 12000);
}

function llmClient(): OpenAI | null {
  const cfg = getConfig();
  if (cfg.customLlmKey && cfg.customLlmBase) {
    return new OpenAI({ apiKey: cfg.customLlmKey, baseURL: cfg.customLlmBase.replace(/\/$/, '') });
  }
  if (cfg.muicvApiKey) {
    return new OpenAI({
      apiKey: cfg.muicvApiKey,
      baseURL: `${cfg.muicvApiBase.replace(/\/$/, '')}/llm/v1`,
    });
  }
  return null;
}

async function writeMatchReport(workspaceDir: string, targetRel: string, match: JdMatchResult): Promise<void> {
  const slug = targetRel.replace(/^targets\//, '').replace(/\.md$/, '');
  const day = new Date().toISOString().slice(0, 10);
  const rel = `match/${slug}-${day}.md`;
  const abs = join(workspaceDir, rel);
  await mkdir(dirname(abs), { recursive: true });
  const verdictLabel =
    match.verdict === 'suitable' ? '🟢 大部分匹配' : match.verdict === 'weak' ? '🟡 部分匹配' : '🔴 差距明显';
  const body = `---
type: match
target: ${targetRel}
generated_at: ${new Date().toISOString()}
verdict: ${match.verdict}
score: ${match.score}
---

# Match 报告：${targetRel}

**结论**：${verdictLabel}（${match.score}）

${match.reason}

## 已覆盖
${match.covered.map((x) => `- ${x}`).join('\n') || '- （无）'}

## 缺口
${match.gaps.map((x) => `- ${x}`).join('\n') || '- （无）'}
`;
  await writeFile(abs, body, 'utf8');
}

async function runMatchThenMaybeGenerate(jobId: string): Promise<void> {
  const rec = jobs.get(jobId);
  const cfg = getConfig();
  if (!rec || !cfg.workspaceDir) return;
  rec.status = 'matching';
  notifyRenderer('extension:job', rec);

  const client = llmClient();
  if (!client) {
    rec.status = 'error';
    rec.error = '未登录，无法判断匹配度。';
    notifyRenderer('extension:job', rec);
    return;
  }

  const summary = await loadMaterialSummary(cfg.workspaceDir);
  const completion = await client.chat.completions.create({
    model: DEFAULT_LLM_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: MATCH_SYSTEM },
      {
        role: 'user',
        content: `## 用户画像\n${summary || '（素材库为空）'}\n\n## 岗位 ${rec.jd.company ?? ''} ${rec.jd.title ?? ''}\n来源：${rec.jd.canonicalUrl}\n\n${rec.jd.markdown.slice(0, 8000)}`,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? '';
  const match = parseMatchJson(text);
  if (!match) {
    rec.status = 'error';
    rec.error = '匹配结果无法解析。';
    notifyRenderer('extension:job', rec);
    return;
  }
  rec.match = match;
  await writeMatchReport(cfg.workspaceDir, rec.targetPath ?? `targets/${targetSlugFor(rec.jd)}.md`, match);

  if (match.verdict === 'suitable') {
    rec.status = 'suitable';
    notifyRenderer('extension:job', rec);
    await startGenerate(jobId);
    return;
  }
  rec.status = 'weak';
  notifyRenderer('extension:job', rec);
}

export async function startGenerate(jobId: string): Promise<JobRecord> {
  const rec = jobs.get(jobId);
  if (!rec) throw Object.assign(new Error('job-not-found'), { status: 404 });
  const cfg = getConfig();
  const profile = getActiveProfile();
  const win = BrowserWindow.getAllWindows()[0];
  if (!cfg.workspaceDir || !profile || !win) {
    throw Object.assign(new Error('no-workspace'), { status: 409 });
  }
  rec.status = 'generating';
  notifyRenderer('extension:job', rec);

  const conv = await createConversation({
    profileId: profile.id,
    type: 'generate',
    title: `${rec.jd.company ?? '岗位'} · ${rec.jd.title ?? '针对性简历'}`.slice(0, 40),
  });
  rec.conversationId = conv.id;
  const userMsg: ChatMessage = {
    id: randomUUID(),
    role: 'user',
    content: `请针对刚保存的岗位 JD（${rec.targetPath}）生成一份投递用简历。只使用素材库已有事实，双写 versions/ 下的 markdown 和 .resume.json。不要编造。`,
    createdAt: Date.now(),
  };
  const channelId = `ext-${jobId.slice(0, 8)}`;
  await runAgent({
    channelId,
    profileId: profile.id,
    convId: conv.id,
    type: 'generate',
    messages: [userMsg],
    config: cfg,
    sender: win.webContents,
  });
  rec.status = 'ready';
  rec.versionPath = `versions/${targetSlugFor(rec.jd)}-*.md`;
  notifyRenderer('extension:job', rec);
  return rec;
}

export async function contributeJob(jobId: string): Promise<{ awarded: number; duplicate: boolean; id?: string }> {
  const rec = jobs.get(jobId);
  if (!rec) throw Object.assign(new Error('job-not-found'), { status: 404 });
  const cfg = getConfig();
  if (!cfg.muicvApiKey) throw Object.assign(new Error('no-api-key'), { status: 401 });
  const res = await fetch(`${cfg.muicvApiBase.replace(/\/$/, '')}/jobs/contribute`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.muicvApiKey}`,
    },
    body: JSON.stringify({ capturedJd: rec.jd }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    awarded?: number;
    duplicate?: boolean;
    id?: string;
    error?: string;
  };
  if (!res.ok) {
    throw Object.assign(new Error(body.error ?? `contribute ${res.status}`), { status: res.status });
  }
  return {
    awarded: body.awarded ?? 0,
    duplicate: Boolean(body.duplicate),
    ...(body.id !== undefined ? { id: body.id } : {}),
  };
}

/** 测试用：塞一条记录。 */
export function upsertJobForTest(rec: JobRecord): void {
  jobs.set(rec.jobId, rec);
}
