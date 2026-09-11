#!/usr/bin/env node

/**
 * 半自动迁移工具：从 `versions/foo.md` 里抽出能机械识别的字段，
 * 输出 `versions/foo.resume.json` 骨架（TemplateResumeData schema）。
 *
 * **不是 LLM 提取**——只做最保守的搬运：
 *   - frontmatter 里的 name / title / email / phone / location → contact + name + title
 *   - body 整体放到 summary 当占位（双语都填同一份，用户再分别润色）
 *   - experience / education / projects / publications / skills / languages / awards
 *     **必须由用户手填**，scaffold 给出 1 个空示例
 *
 * 用法：
 *   node scripts/md-to-resume-json.ts versions/google-swe-2026-04-23.md
 *   → 写出 versions/google-swe-2026-04-23.resume.json，已存在则不覆盖（除非 --force）
 *
 * 输出后用户对照 docs/template-resume-sample.resume.json 把缺失字段补齐即可。
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type Frontmatter = Record<string, string>;

function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  const fm: Frontmatter = {};
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { fm, body: text };
  for (const rawLine of (match[1] ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(line);
    if (!m) continue;
    let v = (m[2] ?? '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[m[1] as string] = v;
  }
  return { fm, body: match[2] ?? '' };
}

function bi(value: string): { zh: string; en: string } {
  return { zh: value, en: value };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--'));
  const input = positional[0];
  if (!input) {
    console.error('用法：node scripts/md-to-resume-json.ts <path/to/version.md> [--force]');
    process.exit(2);
  }

  const inputPath = resolve(process.cwd(), input);
  if (!existsSync(inputPath)) {
    console.error(`找不到文件：${inputPath}`);
    process.exit(2);
  }

  const outputPath = inputPath.replace(/\.md$/i, '.resume.json');
  if (existsSync(outputPath) && !force) {
    console.error(`${outputPath} 已存在；加 --force 覆盖，否则手动改名后重试。`);
    process.exit(1);
  }

  const text = await readFile(inputPath, 'utf8');
  const { fm, body } = parseFrontmatter(text);

  const summary = body.trim().slice(0, 400) || '在这里写一两句研究 / 工作的关键定位（中英文 zh / en 都要）。';

  const scaffold = {
    schemaVersion: 1,
    name: bi(fm.name ?? '替换为你的中英文姓名'),
    title: bi(fm.title ?? '产品 / 工程 / 研究 — 一句话标签'),
    contact: {
      location: fm.location ? bi(fm.location) : { zh: '城市', en: 'City' },
      email: fm.email ?? 'you@example.com',
      ...(fm.phone ? { phone: fm.phone } : {}),
      ...(fm.web ? { web: fm.web } : {}),
      ...(fm.github ? { github: fm.github } : {}),
    },
    summary: bi(summary),
    experience: [
      {
        org: { zh: '公司名', en: 'Company' },
        role: { zh: '职位', en: 'Role' },
        period: '2024.01 — 2025.12',
        location: { zh: '城市', en: 'City' },
        bullets: {
          zh: ['量化成就 1（数字 + 影响）', '量化成就 2'],
          en: ['Quantified outcome 1', 'Quantified outcome 2'],
        },
      },
    ],
    education: [
      {
        school: { zh: '学校', en: 'School' },
        degree: { zh: '学位 · 专业', en: 'Degree · Major' },
        period: '2019 — 2023',
        detail: { zh: 'GPA / 荣誉 / 方向', en: 'GPA / honors / focus' },
      },
    ],
    projects: [
      {
        name: { zh: '项目名', en: 'Project' },
        stack: 'TypeScript · React',
        period: '2024',
        desc: { zh: '一句话讲清楚项目影响', en: 'One-liner about the impact.' },
      },
    ],
    skills: { code: ['TypeScript'], design: ['Figma'] },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(scaffold, null, 2) + '\n', 'utf8');
  console.log(`✓ 已生成 ${outputPath}`);
  console.log('  下一步：对照 docs/template-resume-sample.resume.json 把空字段补齐。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
