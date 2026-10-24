import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('muicv-core 初始化不再要求写 .gitkeep 占位文件', async () => {
  const skill = await readFile(new URL('../../../skills/muicv-core/SKILL.md', import.meta.url), 'utf8');

  assert.equal(skill.includes('不要为了占位写 `.gitkeep`'), true);
  assert.equal(skill.includes('│   └── .gitkeep'), false);
  assert.equal(skill.includes('├── experience/'), true);
  assert.equal(skill.includes('├── targets/'), true);
  assert.equal(skill.includes('├── versions/'), true);
  assert.equal(skill.includes('├── applications/'), true);
});

test('ask_question 提问规则：一次调用只问一个问题，多问题时并行多次调用', async () => {
  const prelude = await readFile(new URL('../src/main/agent/skills.ts', import.meta.url), 'utf8');
  const tool = await readFile(new URL('../src/main/agent/question-tools.ts', import.meta.url), 'utf8');
  const skill = await readFile(new URL('../../../skills/muicv-core/SKILL.md', import.meta.url), 'utf8');

  // 系统 prompt prelude：约束单次调用只含一个问题，多问题在同一回复里并行多次调用
  assert.equal(prelude.includes('每次 \\`ask_question\\` 调用只问一个主题的问题'), true);
  assert.equal(prelude.includes('并行调用多次 \\`ask_question\\`'), true);
  assert.equal(prelude.includes('禁止**把多个子问题用【1】【2】'), true);

  // 工具 description 与参数 describe 同步约束
  assert.equal(tool.includes('一次调用只问一个问题'), true);
  assert.equal(tool.includes('不要在一条问题里拼接多个子问题'), true);

  // muicv-core 的「一次问清」澄清为：并行多次调用，而非塞进一次调用
  assert.equal(skill.includes('并行调用多次 `ask_question`（每次只问一个问题'), true);
});
