#!/usr/bin/env node
/**
 * 把 docs/marketing/<campaign>/*.md 里的多语言文章 seed 到 muicv CMS 的 posts 集合（幂等）。
 *
 * 每篇 md 的 frontmatter 提供发布字段（title / slug / locale / section / status / summary /
 * tags / keywords / author / publishedAt / seoTitle / seoDescription），正文即 bodyMarkdown。
 * 同一篇文章的各语言译文共享同一个 slug，靠 locale 区分；重复执行按 (locale, slug) 走更新。
 *
 * 用法：
 *   MUICV_CMS_API_KEY=xxx node scripts/seed-marketing-posts.ts                 # 全部目录，正式写入
 *   node scripts/seed-marketing-posts.ts --dry-run                             # 只看会写什么
 *   node scripts/seed-marketing-posts.ts deepseek-v4-1-flash                   # 只同步某目录
 *   node scripts/seed-marketing-posts.ts deepseek-v4-1-flash --dry-run
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CmsClient } from '../mcp/payload-client.ts';
import {
  type CreatePostRawInput,
  type NormalizedUpsertPostInput,
  normalizeUpsertPostInput,
} from '../mcp/post-input.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
// packages/cms/scripts → 仓库根 → docs/marketing
const MARKETING_DIR = resolve(scriptDir, '../../../docs/marketing');

type ParsedFrontmatter = {
  data: Record<string, string | string[]>;
  body: string;
};

/**
 * 极简 frontmatter 解析：只支持本项目草稿用到的「标量 + 短列表」两种形态，
 * 不引入 YAML 依赖。格式不合法时抛错，避免静默写出半截内容。
 */
function parseFrontmatter(raw: string, file: string): ParsedFrontmatter {
  if (!raw.startsWith('---\n')) {
    throw new Error(`${file}: 缺少 frontmatter（文件须以 --- 开头）`);
  }
  const end = raw.indexOf('\n---', 3);
  if (end === -1) {
    throw new Error(`${file}: frontmatter 未闭合（缺少结尾 ---）`);
  }
  const header = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\n+/, '');
  const data: Record<string, string | string[]> = {};
  let currentListKey: string | null = null;

  for (const line of header.split('\n')) {
    if (!line.trim()) continue;
    const listItem = /^\s+-\s+(.*)$/.exec(line);
    if (listItem && currentListKey) {
      (data[currentListKey] as string[]).push(stripQuotes(listItem[1]!.trim()));
      continue;
    }
    const kv = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) {
      throw new Error(`${file}: 无法解析的 frontmatter 行：${line}`);
    }
    const [, key, rawValue] = kv;
    const value = rawValue!.trim();
    if (value === '') {
      data[key!] = [];
      currentListKey = key!;
    } else {
      data[key!] = stripQuotes(value);
      currentListKey = null;
    }
  }

  return { data, body };
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function readString(data: Record<string, string | string[]>, key: string, file: string): string {
  const value = data[key];
  if (typeof value !== 'string' || !value) {
    throw new Error(`${file}: frontmatter 缺少必填字段 ${key}`);
  }
  return value;
}

function readList(data: Record<string, string | string[]>, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value) return [value];
  return [];
}

/** 一个 campaign 目录 → 一组待写入的 post（每个语言一份），带来源文件名便于报错定位。 */
function loadCampaign(dir: string): Array<{ file: string; input: CreatePostRawInput }> {
  const fullDir = join(MARKETING_DIR, dir);
  const files = readdirSync(fullDir).filter((name) => name.endsWith('.md') && statSync(join(fullDir, name)).isFile());
  return files.map((name) => {
    const file = join(fullDir, name);
    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
    return {
      file,
      input: {
        title: readString(data, 'title', file),
        slug: readString(data, 'slug', file),
        locale: readString(data, 'locale', file) as CreatePostRawInput['locale'],
        section: readString(data, 'section', file) as CreatePostRawInput['section'],
        status: (typeof data.status === 'string' ? data.status : 'draft') as CreatePostRawInput['status'],
        summary: readString(data, 'summary', file),
        bodyMarkdown: body,
        tags: readList(data, 'tags'),
        keywords: readList(data, 'keywords'),
        author: readString(data, 'author', file),
        publishedAt: readString(data, 'publishedAt', file),
        seoTitle: readString(data, 'seoTitle', file),
        seoDescription: readString(data, 'seoDescription', file),
      },
    };
  });
}

/** 与 post-input.ts 的 zod 约束保持一致，提前用可读报错挡住超长字段。 */
const FIELD_LIMITS = [
  { key: 'title', max: 120 },
  { key: 'seoTitle', max: 120 },
  { key: 'summary', max: 320 },
  { key: 'seoDescription', max: 320 },
] as const;

/**
 * 全部条目先校验再写：避免逐条写入时中途失败、留下「部分语言已发布」的半成品状态。
 * zod 的报错不带文件名，这里显式给出文件 + 原因（长度 / 枚举 / 重复）。
 */
function validateAll(entries: Array<{ file: string; input: CreatePostRawInput }>): NormalizedUpsertPostInput[] {
  const errors: string[] = [];
  const normalized: NormalizedUpsertPostInput[] = [];
  const seen = new Set<string>();
  for (const { file, input } of entries) {
    const dedupeKey = `${input.locale}/${input.slug}`;
    if (seen.has(dedupeKey)) {
      errors.push(`${file}: (locale, slug) 重复：${dedupeKey}`);
    }
    seen.add(dedupeKey);

    const lengthErrors = FIELD_LIMITS.filter(({ key, max }) => {
      const value = input[key];
      return typeof value === 'string' && value.length > max;
    });
    if (lengthErrors.length > 0) {
      for (const { key, max } of lengthErrors) {
        const value = input[key] as string;
        errors.push(`${file}: ${key} 长度 ${value.length} 超过上限 ${max}`);
      }
      // 已知长度问题就不必再跑 zod（否则同一问题会以两种措辞重复报出）。
      continue;
    }

    try {
      normalized.push(normalizeUpsertPostInput({ ...input, onConflict: 'update' }));
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`校验未通过，未写入任何内容：\n  - ${errors.join('\n  - ')}`);
  }
  return normalized;
}

function listCampaigns(): string[] {
  return readdirSync(MARKETING_DIR).filter((name) => statSync(join(MARKETING_DIR, name)).isDirectory());
}

function parseArgs(argv: string[]): { dryRun: boolean; campaigns: string[] } {
  const dryRun = argv.includes('--dry-run');
  const campaigns = argv.filter((arg) => !arg.startsWith('--'));
  return { dryRun, campaigns };
}

async function main(): Promise<void> {
  const { dryRun, campaigns } = parseArgs(process.argv.slice(2));
  const targets = campaigns.length > 0 ? campaigns : listCampaigns();
  const entries = targets.flatMap((dir) => loadCampaign(dir));
  // 先整体校验（含 normalizeUpsertPostInput）并归一化，通过后才写，避免半成品。
  const normalizedPosts = validateAll(entries);

  process.stdout.write(
    `共 ${normalizedPosts.length} 篇待同步（${targets.join(', ')}）${dryRun ? '（dry run，不写入）' : ''}\n`,
  );
  for (const { payload } of normalizedPosts) {
    process.stdout.write(`  [${payload.locale}] ${payload.section}/${payload.slug} · ${payload.title}\n`);
  }

  if (dryRun) return;

  const apiKey = process.env.MUICV_CMS_API_KEY?.trim();
  if (!apiKey) {
    process.stdout.write(
      '提示：未检测到 MUICV_CMS_API_KEY。如需正式写入远端 Payload CMS，请提供环境变量 MUICV_CMS_API_KEY=xxx。\n',
    );
    return;
  }

  const cmsBaseUrl = process.env.MUICV_CMS_URL?.trim();
  const client = new CmsClient({ ...(cmsBaseUrl ? { baseUrl: cmsBaseUrl } : {}), apiKey });
  let created = 0;
  let updated = 0;

  for (const { payload } of normalizedPosts) {
    const existing = await client.findPostBySlug(payload.slug, payload.locale);
    if (!existing) {
      await client.createPost(payload);
      created += 1;
      process.stdout.write(`  ✓ 新建 [${payload.locale}]: ${payload.slug}\n`);
    } else {
      await client.updatePost(existing.id, payload);
      updated += 1;
      process.stdout.write(`  ✓ 更新 [${payload.locale}]: ${payload.slug}\n`);
    }
  }

  process.stdout.write(`完成：新建 ${created} 篇，更新 ${updated} 篇。\n`);
}

main().catch((error) => {
  process.stderr.write(`执行失败: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
