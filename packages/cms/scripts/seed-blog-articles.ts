#!/usr/bin/env node
/** 把已有博客 seed 到 muicv CMS 的 articles 集合（幂等，可重复执行）。
 *
 *  数据源：
 *  - dyqr：公开只读接口 https://app.dyqr.me/api/site-content（无需鉴权）；
 *  - taomenu：当前没有存量文章，跳过；
 *  - muicv：posts 集合本来就是 CMS 自己的数据，无需迁移；
 *  - muirouter：mui-api 导出的 JSON 文件（由其仓库 packages/dashboard/scripts/export-blog-for-cms.ts
 *    产出，通过环境变量 MUIAPI_BLOG_EXPORT 指定路径；未设置时跳过该数据源）。
 *
 *  写入需要 API key，通过环境变量提供（不会读取任何 .env 文件）：
 *    MUICV_CMS_API_KEY=xxx node scripts/seed-blog-articles.ts
 *
 *  用法：
 *    MUICV_CMS_API_KEY=xxx MUIAPI_BLOG_EXPORT=./blog-export.json node scripts/seed-blog-articles.ts   # 正式写入
 *    node scripts/seed-blog-articles.ts --dry-run                                                      # 只看会写什么
 */

import * as fs from 'node:fs';
import * as z from 'zod/v4';

import {
  normalizeUpsertArticlePayload,
  type UpsertArticleInput,
  upsertArticleInputSchema,
} from '../mcp/article-input.ts';
import { CmsClient } from '../mcp/payload-client.ts';
import { buildArticlePayload, parseDyqrSiteContent, parseMuiApiExport, type SeedSite } from './seed-article-lib.ts';

const DYQR_SITE_CONTENT_URL = process.env.DYQR_SITE_CONTENT_URL ?? 'https://app.dyqr.me/api/site-content';
const MUIAPI_BLOG_EXPORT = process.env.MUIAPI_BLOG_EXPORT?.trim();

const SITE_AUTHORS: Record<SeedSite, string> = {
  muicv: 'Mui简历',
  dyqr: 'DYQR.me',
  taomenu: 'TaoMenu',
  muirouter: 'MuiRouter',
};

type SeedTask = {
  site: SeedSite;
  locale: string;
  slug: string;
  input: UpsertArticleInput;
};

function parseArgs(argv: string[]): { dryRun: boolean } {
  return { dryRun: argv.includes('--dry-run') };
}

async function fetchDyqrArticles(): Promise<UpsertArticleInput[]> {
  process.stdout.write(`拉取 ${DYQR_SITE_CONTENT_URL} ...\n`);
  const response = await fetch(DYQR_SITE_CONTENT_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`dyqr site-content 拉取失败 HTTP ${response.status}`);
  }

  const articles = parseDyqrSiteContent(await response.json());
  const result: UpsertArticleInput[] = [];
  for (const article of articles) {
    const draft = {
      ...buildArticlePayload(article, { site: 'dyqr', author: SITE_AUTHORS.dyqr }),
      status: 'published' as const,
    };
    const parsed = upsertArticleInputSchema.safeParse(draft);
    if (!parsed.success) {
      throw new Error(
        `[${article.locale}/${article.slug}] 数据不满足 articles 字段约束：${z.prettifyError(parsed.error)}`,
      );
    }
    result.push(parsed.data);
  }
  return result;
}

function readMuiApiArticles(): UpsertArticleInput[] {
  if (!MUIAPI_BLOG_EXPORT) {
    return [];
  }
  process.stdout.write(`读取 ${MUIAPI_BLOG_EXPORT} ...\n`);
  const raw = JSON.parse(fs.readFileSync(MUIAPI_BLOG_EXPORT, 'utf8')) as unknown;
  const articles = parseMuiApiExport(raw);
  const result: UpsertArticleInput[] = [];
  for (const article of articles) {
    const parsed = upsertArticleInputSchema.safeParse(article);
    if (!parsed.success) {
      throw new Error(
        `[${article.locale}/${article.slug}] 数据不满足 articles 字段约束：${z.prettifyError(parsed.error)}`,
      );
    }
    result.push(parsed.data);
  }
  return result;
}

async function collectTasks(): Promise<SeedTask[]> {
  // taomenu 目前没有存量文章可迁移；muicv 的 posts 本来就在 CMS 里。
  // 以后要扩展其他站点数据源，在这里追加即可。
  const dyqrInputs = await fetchDyqrArticles();
  const muiApiInputs = readMuiApiArticles();
  return [
    ...dyqrInputs.map((input) => ({ site: 'dyqr' as const, locale: input.locale, slug: input.slug, input })),
    ...muiApiInputs.map((input) => ({ site: 'muirouter' as const, locale: input.locale, slug: input.slug, input })),
  ];
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const tasks = await collectTasks();

  process.stdout.write(`共 ${tasks.length} 篇文章待同步${dryRun ? '（dry run，不写入）' : ''}\n`);
  for (const task of tasks) {
    process.stdout.write(`  [${task.site}] ${task.locale}/${task.slug} · ${task.input.title}\n`);
  }

  if (tasks.length === 0 || dryRun) {
    return;
  }

  const apiKey = process.env.MUICV_CMS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('缺少 MUICV_CMS_API_KEY 环境变量。请在 Payload 后台 Users 里生成 API key 后再执行。');
  }

  const cmsBaseUrl = process.env.MUICV_CMS_URL?.trim();
  const client = new CmsClient({ ...(cmsBaseUrl ? { baseUrl: cmsBaseUrl } : {}), apiKey });
  let created = 0;
  let updated = 0;

  for (const task of tasks) {
    const payload = normalizeUpsertArticlePayload(task.input);
    const existing = await client.findArticleBySlug(task.site, task.locale, task.slug);
    if (existing) {
      await client.updateArticle(existing.id, payload);
      updated += 1;
      process.stdout.write(`  更新 [${task.site}] ${task.locale}/${task.slug}\n`);
    } else {
      await client.createArticle(payload);
      created += 1;
      process.stdout.write(`  新建 [${task.site}] ${task.locale}/${task.slug}\n`);
    }
  }

  process.stdout.write(`完成：新建 ${created} 篇，更新 ${updated} 篇。\n`);
}

await main();
