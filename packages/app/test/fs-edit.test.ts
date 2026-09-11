import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, beforeEach } from 'node:test';

import { __testing, writeFileToWorkspace } from '../src/main/fs-edit.ts';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'muicv-fsedit-'));
});

after(async () => {
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

test('writeFileToWorkspace 正常写入 workspace 内的 .md 文件', async () => {
  const target = join(workspace, 'profile.md');
  // 父目录存在（workspace 本身就是它的父目录）
  const r = await writeFileToWorkspace(workspace, target, '# hello');
  assert.deepEqual(r, { ok: true });
  const content = await readFile(target, 'utf8');
  assert.equal(content, '# hello');
});

test('writeFileToWorkspace 支持子目录下的 .md', async () => {
  const expDir = join(workspace, 'experience');
  await mkdir(expDir);
  const target = join(expDir, 'acme-2023.md');
  const r = await writeFileToWorkspace(workspace, target, '# acme');
  assert.equal(r.ok, true);
});

test('writeFileToWorkspace 拒绝越过 workspaceDir 的绝对路径', async () => {
  const r = await writeFileToWorkspace(workspace, '/etc/passwd.md', 'pwn');
  assert.deepEqual(r, { ok: false, error: 'out-of-workspace' });
});

test('writeFileToWorkspace 拒绝 .. 越界的路径（resolve 后越界）', async () => {
  // workspace 同级伪造一个目录，再用 .. 跨过去
  const sibling = join(workspace, '..', 'sibling-target.md');
  const r = await writeFileToWorkspace(workspace, sibling, 'pwn');
  assert.deepEqual(r, { ok: false, error: 'out-of-workspace' });
});

test('writeFileToWorkspace 拒绝 .claude/ 内的路径', async () => {
  const claudeDir = join(workspace, '.claude');
  await mkdir(claudeDir);
  const target = join(claudeDir, 'settings.md');
  const r = await writeFileToWorkspace(workspace, target, 'x');
  assert.deepEqual(r, { ok: false, error: 'protected-dir' });
});

test('writeFileToWorkspace 拒绝 .claude 子目录嵌套', async () => {
  const target = join(workspace, '.claude', 'sub', 'evil.md');
  const r = await writeFileToWorkspace(workspace, target, 'x');
  assert.deepEqual(r, { ok: false, error: 'protected-dir' });
});

test('writeFileToWorkspace 拒绝非 .md / .markdown 扩展名', async () => {
  const target = join(workspace, 'foo.txt');
  const r = await writeFileToWorkspace(workspace, target, 'x');
  assert.deepEqual(r, { ok: false, error: 'unsupported-ext' });
});

test('writeFileToWorkspace 接受 .markdown 扩展名', async () => {
  const target = join(workspace, 'foo.markdown');
  const r = await writeFileToWorkspace(workspace, target, '# ok');
  assert.equal(r.ok, true);
});

test('writeFileToWorkspace 拒绝超过 1MB 的内容', async () => {
  const big = 'x'.repeat(__testing.MAX_BYTES + 1);
  const target = join(workspace, 'big.md');
  const r = await writeFileToWorkspace(workspace, target, big);
  assert.deepEqual(r, { ok: false, error: 'too-large' });
});

test('writeFileToWorkspace 接受刚好 1MB 的内容', async () => {
  const exact = 'x'.repeat(__testing.MAX_BYTES);
  const target = join(workspace, 'exact.md');
  const r = await writeFileToWorkspace(workspace, target, exact);
  assert.equal(r.ok, true);
});

test('writeFileToWorkspace 没有 workspaceDir 时返回 no-workspace', async () => {
  const r = await writeFileToWorkspace(null, '/tmp/x.md', 'x');
  assert.deepEqual(r, { ok: false, error: 'no-workspace' });
  const r2 = await writeFileToWorkspace('', '/tmp/x.md', 'x');
  assert.deepEqual(r2, { ok: false, error: 'no-workspace' });
});

test('writeFileToWorkspace bad-input：path 不是字符串', async () => {
  const r = await writeFileToWorkspace(workspace, 123 as unknown as string, 'x');
  assert.deepEqual(r, { ok: false, error: 'bad-input' });
});

test('writeFileToWorkspace bad-input：content 不是字符串', async () => {
  const r = await writeFileToWorkspace(workspace, join(workspace, 'a.md'), null as unknown as string);
  assert.deepEqual(r, { ok: false, error: 'bad-input' });
});

test('writeFileToWorkspace 父目录不存在时返回 io-error，不崩', async () => {
  const target = join(workspace, 'nope', 'sub', 'x.md');
  const r = await writeFileToWorkspace(workspace, target, 'x');
  assert.deepEqual(r, { ok: false, error: 'io-error' });
});

test('writeFileToWorkspace 写入成功后无残留 tmp 文件', async () => {
  const target = join(workspace, 'no-tmp.md');
  const r = await writeFileToWorkspace(workspace, target, 'final');
  assert.equal(r.ok, true);
  const entries = await readdir(workspace);
  assert.deepEqual(entries.sort(), ['no-tmp.md']);
});

test('writeFileToWorkspace rename 失败时不留下半成品（io-error）', async () => {
  // 通过注入失败的 rename 模拟原子写第二步爆炸
  const target = join(workspace, 'fail-rename.md');
  const r = await writeFileToWorkspace(workspace, target, 'x', {
    rename: async () => {
      throw new Error('disk full');
    },
  });
  assert.deepEqual(r, { ok: false, error: 'io-error' });
  // 即使 tmp 文件残留也只是隐藏文件（以 . 开头），不会污染列表
  const visible = (await readdir(workspace)).filter((n) => !n.startsWith('.'));
  assert.deepEqual(visible, []);
});

test('writeFileToWorkspace 内容覆盖既有文件', async () => {
  const target = join(workspace, 'overwrite.md');
  await writeFile(target, 'old', 'utf8');
  const r = await writeFileToWorkspace(workspace, target, 'new');
  assert.equal(r.ok, true);
  assert.equal(await readFile(target, 'utf8'), 'new');
});
