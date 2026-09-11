import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hashResumeFiles,
  RESUME_SYNC_MAX_FILE_COUNT,
  RESUME_SYNC_MAX_SIZE_BYTES,
  validateResumeSyncPayload,
} from '../src/resume-sync.ts';

test('validateResumeSyncPayload: 拒绝非对象 / 缺 files / 空 files', () => {
  for (const bad of [null, undefined, 'foo', 42, [], {}, { files: null }, { files: [] }, { files: {} }]) {
    const r = validateResumeSyncPayload(bad);
    assert.equal(r.ok, false, `应拒绝：${JSON.stringify(bad)}`);
  }
});

test('validateResumeSyncPayload: 拒绝非法路径', () => {
  const cases: Array<[string, string]> = [
    ['', 'empty'],
    ['/abs/path.md', 'leading slash'],
    ['../escape.md', 'parent dir'],
    ['nested/../escape.md', 'parent dir nested'],
    ['file.txt', 'wrong extension'],
    ['no-ext', 'wrong extension'],
    [`${'x'.repeat(201)}.md`, 'too long'],
  ];
  for (const [path, desc] of cases) {
    const r = validateResumeSyncPayload({ files: { [path]: 'content' } });
    assert.equal(r.ok, false, `应拒绝（${desc}）：${path}`);
  }
});

test('validateResumeSyncPayload: 接受合法路径', () => {
  const r = validateResumeSyncPayload({
    files: {
      'profile.md': '# 我',
      'experience/google.md': '---\ntype: experience\n---',
      'projects/muicv.md': 'foo',
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.fileCount, 3);
    assert.ok(r.sizeBytes > 0);
  }
});

test('validateResumeSyncPayload: 拒绝超大 / 文件数过多', () => {
  // 超大单文件
  const big = 'a'.repeat(RESUME_SYNC_MAX_SIZE_BYTES + 1);
  const r1 = validateResumeSyncPayload({ files: { 'big.md': big } });
  assert.equal(r1.ok, false);

  // 文件数过多
  const many: Record<string, string> = {};
  for (let i = 0; i < RESUME_SYNC_MAX_FILE_COUNT + 1; i++) {
    many[`f${i}.md`] = '';
  }
  const r2 = validateResumeSyncPayload({ files: many });
  assert.equal(r2.ok, false);
});

test('hashResumeFiles: 内容相同 hash 相同（与 key 顺序无关）', async () => {
  const a = await hashResumeFiles({ 'a.md': '1', 'b.md': '2' });
  const b = await hashResumeFiles({ 'b.md': '2', 'a.md': '1' });
  assert.equal(a, b);

  const c = await hashResumeFiles({ 'a.md': '1', 'b.md': '3' });
  assert.notEqual(a, c);
});
