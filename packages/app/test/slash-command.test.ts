import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSlashState } from '../src/renderer/lib/use-slash-command.ts';
import { matchesQuery, SKILL_COMMANDS } from '../src/shared/skill-commands.ts';

test('parseSlashState 空字符串 → 关', () => {
  assert.deepEqual(parseSlashState(''), { open: false, query: '' });
});

test('parseSlashState 单独 `/` → 开，query 空', () => {
  assert.deepEqual(parseSlashState('/'), { open: true, query: '' });
});

test('parseSlashState `/cri` → 开，query=cri', () => {
  assert.deepEqual(parseSlashState('/cri'), { open: true, query: 'cri' });
});

test('parseSlashState 出现空格 → 关（命令模式结束，进入补充上下文）', () => {
  assert.deepEqual(parseSlashState('/cri 评审'), { open: false, query: '' });
});

test('parseSlashState 出现换行 → 关', () => {
  assert.deepEqual(parseSlashState('/jobs\n'), { open: false, query: '' });
});

test('parseSlashState 不是开头 → 关（路径里的 / 不误触）', () => {
  assert.deepEqual(parseSlashState('hello /world'), { open: false, query: '' });
  assert.deepEqual(parseSlashState('a/b'), { open: false, query: '' });
});

test('parseSlashState 允许前导空白', () => {
  assert.deepEqual(parseSlashState('  /jobs'), { open: true, query: 'jobs' });
});

test('matchesQuery 空 query → 全 true', () => {
  for (const cmd of SKILL_COMMANDS) {
    assert.equal(matchesQuery(cmd, ''), true);
  }
});

test('matchesQuery slash 前缀匹配', () => {
  const critique = SKILL_COMMANDS.find((c) => c.slash === 'critique');
  assert.ok(critique);
  assert.equal(matchesQuery(critique, 'cri'), true);
  assert.equal(matchesQuery(critique, 'CRI'), true);
});

test('matchesQuery 中文 label / tagline 匹配', () => {
  const critique = SKILL_COMMANDS.find((c) => c.slash === 'critique');
  assert.ok(critique);
  assert.equal(matchesQuery(critique, '评审'), true);
});

test('matchesQuery 不匹配返回 false', () => {
  const critique = SKILL_COMMANDS.find((c) => c.slash === 'critique');
  assert.ok(critique);
  assert.equal(matchesQuery(critique, 'xyz'), false);
});

test('SKILL_COMMANDS 7 项，slash 唯一', () => {
  assert.equal(SKILL_COMMANDS.length, 7);
  const slashes = new Set(SKILL_COMMANDS.map((c) => c.slash));
  assert.equal(slashes.size, 7);
});

test('SKILL_COMMANDS 每项 promptTemplate 非空，作为光标终点必须有意义', () => {
  for (const cmd of SKILL_COMMANDS) {
    assert.ok(cmd.promptTemplate.length > 0, `${cmd.slash} promptTemplate 不能为空`);
  }
});
