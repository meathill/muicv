import assert from 'node:assert/strict';
import test from 'node:test';

import { closePreviewTab, EMPTY_PREVIEW_TABS, openPreviewTab } from '../src/renderer/lib/preview-tabs.ts';

test('收起抽屉后仍保留所有标签，重新打开已有文件只切换选中项', () => {
  const first = openPreviewTab(EMPTY_PREVIEW_TABS, '/projects/notes.md');
  const second = openPreviewTab(first, '/experience/notes.md');
  const hidden = { ...second, isOpen: false };

  assert.deepEqual(openPreviewTab(hidden, '/projects/notes.md'), {
    paths: ['/projects/notes.md', '/experience/notes.md'],
    activePath: '/projects/notes.md',
    isOpen: true,
  });
});

test('关闭标签时保留其它文件，关闭选中标签后选中相邻标签', () => {
  const first = openPreviewTab(EMPTY_PREVIEW_TABS, '/a.md');
  const second = openPreviewTab(first, '/b.md');
  const third = openPreviewTab(second, '/c.md');

  const closedInactive = closePreviewTab(third, '/a.md');
  assert.equal(closedInactive.activePath, '/c.md');
  assert.deepEqual(closedInactive.paths, ['/b.md', '/c.md']);

  const closedActive = closePreviewTab(closedInactive, '/c.md');
  assert.equal(closedActive.activePath, '/b.md');
  assert.equal(closedActive.isOpen, true);
  assert.deepEqual(closePreviewTab(closedActive, '/b.md'), EMPTY_PREVIEW_TABS);
});
