import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { matchAutoPromptFor } from '../src/renderer/lib/store.ts';

test('matchAutoPromptFor：正时区格式', () => {
  const prompt = matchAutoPromptFor(8);
  assert.ok(prompt.includes('素材库'), '要提到读素材库');
  assert.ok(prompt.includes('search_jobs'), '要指名用 search_jobs 检索');
  assert.ok(prompt.includes('UTC+8'), '要带上用户时区');
  assert.ok(prompt.includes('不要编造'), '要强调只用素材事实');
  assert.ok(prompt.includes('不要中途停下来问我'), '自动执行不该中途挂起等回答');
  assert.ok(prompt.includes('fetch_jd'), '要给挑中岗位后的下一步');
});

test('matchAutoPromptFor：负时区与半小时偏移格式', () => {
  assert.ok(matchAutoPromptFor(-5).includes('UTC-5'));
  assert.ok(matchAutoPromptFor(5.5).includes('UTC+5.5'));
});

test('muicv-job-match skill 已注入且关键章节齐全', async () => {
  const skills = await readFile(new URL('../src/main/agent/skills.ts', import.meta.url), 'utf8');
  assert.equal(skills.includes('@skills/muicv-job-match/SKILL.md?raw'), true);
  assert.equal(skills.includes("name: 'muicv-job-match'"), true);

  const skill = await readFile(new URL('../../../skills/muicv-job-match/SKILL.md', import.meta.url), 'utf8');
  assert.equal(skill.includes('name: muicv-job-match'), true);
  assert.equal(skill.includes('不落盘'), true, '榜单只在对话输出，不写素材库');
  assert.equal(skill.includes('2~4 组'), true, '检索组数约定');
  assert.equal(skill.includes('不要中途 ask_question'), true, '自动执行不挂起');
  assert.equal(skill.includes('未覆盖的关键词') || skill.includes('差距'), true, '差距是关键产出');
});
