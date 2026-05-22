import assert from 'node:assert/strict';
import test from 'node:test';

import { readFile } from 'node:fs/promises';

test('muicv-core 初始化不再要求写 .gitkeep 占位文件', async () => {
  const skill = await readFile(new URL('../../../skills/muicv-core/SKILL.md', import.meta.url), 'utf8');

  assert.equal(skill.includes('不要为了占位写 `.gitkeep`'), true);
  assert.equal(skill.includes('│   └── .gitkeep'), false);
  assert.equal(skill.includes('├── experience/'), true);
  assert.equal(skill.includes('├── targets/'), true);
  assert.equal(skill.includes('├── versions/'), true);
  assert.equal(skill.includes('├── applications/'), true);
});
