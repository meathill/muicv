import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import {
  assertTemplateResumeData,
  isJsonTemplateId,
  isTemplateId,
  JSON_TEMPLATE_IDS,
  TEMPLATE_IDS,
  type TemplateResumeData,
} from '@muicv/shared';
import { tool } from '@openai/agents';
import { z } from 'zod';

import type { AppConfig } from '../../shared/types.ts';
import { getActiveProfile, setProfileDefaultTemplate } from '../store.ts';
import type { ArtifactEmitter } from './tools.ts';

/**
 * muicv 后端 API 工具：让 agent 能创建在线预览 / 渲染 PDF / 抓 JD / 管理默认模板。
 *
 * - create_resume_preview：把 .resume.json 上传到 muicv 创建公开预览链接（owner 在
 *   网页里选模板 + 下载 PDF）。默认走这一条，AI 不要替用户挑模板。
 * - render_resume_pdf：仅当用户已经选好模板（active profile.defaultTemplate 或
 *   明确指令）才用——读本地源 → POST /render → 写 PDF 到同名 .pdf
 * - set_default_template：用户说"以后默认用 X"时调一次，写到 active profile，
 *   下次 render_resume_pdf 跳过预览。
 * - fetch_jd：用户给招聘 URL → POST /jobs/fetch → 拼 frontmatter 写到 targets/。
 *
 * 不带 muicv API key 时也能调（走匿名 IP 速率），失败会清晰报错让 agent
 * 告诉用户去 dashboard 配 key。
 */

function resolveInWorkspace(workspaceDir: string, relPath: string): string {
  const normalized = relPath.replace(/^[/\\]+/, '');
  const abs = resolve(workspaceDir, normalized);
  const root = workspaceDir.endsWith(sep) ? workspaceDir : workspaceDir + sep;
  if (abs !== workspaceDir && !abs.startsWith(root)) {
    throw new Error(`路径越界（必须在工作目录内）：${relPath}`);
  }
  return abs;
}

function shortRel(workspaceDir: string, abs: string): string {
  return relative(workspaceDir, abs) || '.';
}

function authHeader(config: AppConfig): Record<string, string> {
  return config.muicvApiKey ? { authorization: `Bearer ${config.muicvApiKey}` } : {};
}

export function buildApiTools(config: AppConfig, emitArtifact?: ArtifactEmitter) {
  const templateEnumDesc = TEMPLATE_IDS.join(' / ');
  const jsonTemplateEnumDesc = JSON_TEMPLATE_IDS.join(' / ');

  const renderResumePdf = tool({
    name: 'render_resume_pdf',
    description:
      '把简历渲染成 A4 PDF 写到本地。**仅在以下情况调用**：(a) active profile 已有 defaultTemplate；(b) 用户明确点名某个模板或说"直接出 PDF 用 X 模板"。' +
      '默认情况下用户没指定模板时，**改调 create_resume_preview** 让用户在网页选。' +
      '路径以 .resume.json 结尾走 JSON 模板（t1-t6），以 .md 结尾走 markdown default 模板。',
    parameters: z.object({
      path: z.string().describe('源文件相对工作目录的路径：.resume.json（推荐）或 .md'),
      template: z
        .string()
        .describe(`模板 id，必须是 ${templateEnumDesc} 之一。.resume.json 必须用 t1-t6；.md 必须用 default。`),
    }),
    execute: async ({ path, template }) => {
      if (!config.workspaceDir) return '工作目录未配置';
      if (!isTemplateId(template)) {
        return `template 不合法（必须是 ${templateEnumDesc} 之一）`;
      }
      const sourceAbs = resolveInWorkspace(config.workspaceDir, path);
      const isJson = /\.resume\.json$/i.test(path);
      const isMd = /\.md$/i.test(path);
      if (!isJson && !isMd) {
        return 'path 必须是 .resume.json 或 .md';
      }
      if (isJson && !isJsonTemplateId(template)) {
        return `.resume.json 路径必须用 JSON 模板（${jsonTemplateEnumDesc} 之一），收到 ${template}`;
      }
      if (isMd && template !== 'default') {
        return `.md 路径只能用 default 模板，收到 ${template}（要换可视化模板需要先转 .resume.json 再渲染）`;
      }

      let body: Record<string, unknown>;
      if (isJson) {
        let resumeJson: TemplateResumeData;
        try {
          const text = await readFile(sourceAbs, 'utf8');
          const parsed = JSON.parse(text) as unknown;
          assertTemplateResumeData(parsed);
          resumeJson = parsed;
        } catch (err) {
          return `读不到/解析失败 ${path}：${err instanceof Error ? err.message : String(err)}`;
        }
        body = { resumeJson, template };
      } else {
        let markdown: string;
        try {
          markdown = await readFile(sourceAbs, 'utf8');
        } catch {
          return `读不到源文件：${path}`;
        }
        body = { markdown, template };
      }

      let res: Response;
      try {
        res = await fetch(`${config.muicvApiBase}/render`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/pdf',
            ...authHeader(config),
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        return `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return `muicv /render 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`;
      }

      const pdfBytes = new Uint8Array(await res.arrayBuffer());
      const targetRel = path.replace(/\.resume\.json$/i, '.pdf').replace(/\.md$/i, '.pdf');
      const targetAbs = resolveInWorkspace(config.workspaceDir, targetRel);
      await mkdir(dirname(targetAbs), { recursive: true });
      await writeFile(targetAbs, pdfBytes);
      emitArtifact?.({ kind: 'resume-version', path: targetAbs, title: basename(targetAbs), source: 'write' });
      return `PDF 已生成：${shortRel(config.workspaceDir, targetAbs)}（${(pdfBytes.length / 1024).toFixed(1)} KB）`;
    },
  });

  const createResumePreview = tool({
    name: 'create_resume_preview',
    description:
      '把一份 .resume.json 上传到 muicv 创建可分享的在线预览页（含 token），返回 https URL。' +
      '用户**没有**预设模板、或用户说"换个模板看看 / 帮我导出简历"时**默认调本工具**，' +
      '让用户在网页选模板 + 主动下载 PDF。如果 active profile 已有 defaultTemplate，' +
      '初始模板用它；否则用 t1-classic 作占位（用户在网页可立即换）。' +
      '需要 muicv API key（未登录时报错让用户去 dashboard 配 key）。',
    parameters: z.object({
      path: z.string().describe('TemplateResumeData JSON 文件相对路径，应以 .resume.json 结尾'),
    }),
    execute: async ({ path }) => {
      if (!config.workspaceDir) return '工作目录未配置';
      if (!config.muicvApiKey) {
        return '还没配置 muicv API key。请用户打开「设置 → 桌面应用凭证」绑定账号后重试。';
      }
      const sourceAbs = resolveInWorkspace(config.workspaceDir, path);
      let resumeJson: TemplateResumeData;
      try {
        const text = await readFile(sourceAbs, 'utf8');
        const parsed = JSON.parse(text) as unknown;
        assertTemplateResumeData(parsed);
        resumeJson = parsed;
      } catch (err) {
        return `读不到/解析失败 ${path}：${err instanceof Error ? err.message : String(err)}`;
      }

      const active = getActiveProfile();
      const stored = active?.defaultTemplate ?? null;
      const initialTemplate = stored && isJsonTemplateId(stored) ? stored : 't1-classic';

      let res: Response;
      try {
        res = await fetch(`${config.muicvApiBase}/preview`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeader(config) },
          body: JSON.stringify({ resumeJson, template: initialTemplate }),
        });
      } catch (err) {
        return `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return `muicv /preview 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`;
      }
      let body: { url?: string; token?: string; template?: string };
      try {
        body = (await res.json()) as { url?: string; token?: string; template?: string };
      } catch {
        return 'muicv /preview 响应不是合法 JSON';
      }
      if (!body.url || !body.token) {
        return 'muicv /preview 响应缺少 url/token';
      }
      emitArtifact?.({
        kind: 'resume-preview',
        path: body.url,
        title: '在线预览',
        source: 'write',
      });
      return `预览已生成：${body.url}（初始模板 ${body.template ?? initialTemplate}）。请用户打开链接，在网页里挑模板并下载 PDF。`;
    },
  });

  const setDefaultTemplate = tool({
    name: 'set_default_template',
    description:
      '把"默认简历模板"写到当前激活 profile。用户说"以后都用 X 模板 / 把 X 设为默认"时调一次。' +
      '设置后，后续 render_resume_pdf 可以跳过预览直接出 PDF。template = null 表示清除（恢复默认走预览）。',
    parameters: z.object({
      template: z.string().nullable().describe(`模板 id（${templateEnumDesc} 之一）或 null（清除）`),
    }),
    execute: async ({ template }) => {
      const active = getActiveProfile();
      if (!active) return '当前没有激活的 profile，无法设置默认模板。请用户先在「档案」里选一份。';
      if (template !== null && !isTemplateId(template)) {
        return `template 不合法（必须是 ${templateEnumDesc} 之一，或 null 清除）`;
      }
      setProfileDefaultTemplate(active.id, template);
      if (template === null) {
        return `已清除「${active.name}」的默认模板，下次导出会走网页预览让用户挑。`;
      }
      return `已把「${active.name}」的默认简历模板设为 ${template}。后续导出可直接出 PDF；用户要回到选模板可以让我清除（template=null）。`;
    },
  });

  const fetchJd = tool({
    name: 'fetch_jd',
    description:
      '抓取一个招聘页面 URL 的 JD 正文，清洗成 markdown 写到 targets/<slug>.md，含 frontmatter（company / title / source_url / fetched_at）。',
    parameters: z.object({
      url: z.string().describe('招聘页面公开可访问 URL'),
      savePath: z.string().nullable().describe('目标路径，相对工作目录。null = 按 company-title 自动 slug 到 targets/'),
    }),
    execute: async ({ url, savePath }) => {
      if (!config.workspaceDir) return '工作目录未配置';
      if (!/^https?:\/\//i.test(url)) return 'url 必须是 http/https';

      let res: Response;
      try {
        res = await fetch(`${config.muicvApiBase}/jobs/fetch`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...authHeader(config),
          },
          body: JSON.stringify({ url }),
        });
      } catch (err) {
        return `调 muicv API 失败（网络错）：${err instanceof Error ? err.message : String(err)}`;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return `muicv /jobs/fetch 返回 ${res.status}：${text.slice(0, 300) || '未知错误'}`;
      }

      let body: {
        markdown?: string;
        meta?: {
          title?: string | null;
          company?: string | null;
          source_url?: string | null;
          fetched_at?: string | null;
          description?: string | null;
        };
      };
      try {
        body = await res.json();
      } catch {
        return 'muicv /jobs/fetch 响应不是合法 JSON';
      }

      if (typeof body.markdown !== 'string' || body.markdown.length === 0) {
        return 'muicv 没拿到 JD 正文（可能登录墙 / SPA 渲染失败），请用户复制粘贴 JD 文本到 targets/<slug>.md';
      }

      const meta = body.meta ?? {};
      const slug = savePath ? null : slugify(`${meta.company ?? 'company'}-${meta.title ?? 'role'}`);
      const targetRel = savePath ?? `targets/${slug}.md`;
      const targetAbs = resolveInWorkspace(config.workspaceDir, targetRel);

      const frontmatter = [
        '---',
        'type: target',
        meta.company ? `company: ${escapeYaml(meta.company)}` : null,
        meta.title ? `title: ${escapeYaml(meta.title)}` : null,
        meta.source_url ? `source_url: ${escapeYaml(meta.source_url)}` : null,
        `fetched_at: ${meta.fetched_at ?? new Date().toISOString()}`,
        '---',
      ]
        .filter(Boolean)
        .join('\n');

      const content = `${frontmatter}\n\n## JD 正文\n\n${body.markdown.trim()}\n`;
      await mkdir(dirname(targetAbs), { recursive: true });
      await writeFile(targetAbs, content, 'utf8');
      emitArtifact?.({ kind: 'jd-target', path: targetAbs, title: basename(targetAbs), source: 'write' });
      return `JD 已保存到 ${shortRel(config.workspaceDir, targetAbs)}${
        meta.company ? `（${meta.company} / ${meta.title}）` : ''
      }`;
    },
  });

  return [renderResumePdf, createResumePreview, setDefaultTemplate, fetchJd];
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9一-龥-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'target'
  );
}

function escapeYaml(s: string): string {
  // 简单加引号兜底特殊字符
  if (/[:#[\]{}|>*!&%@`,]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}
