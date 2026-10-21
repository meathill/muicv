import assert from 'node:assert/strict';
import test from 'node:test';

import { submissionsUrl } from '../src/popup/view.ts';

test('提交记录链接按语言选后台', () => {
  assert.equal(submissionsUrl('zh_CN'), 'https://muicv.com/dashboard/submissions');
  assert.equal(submissionsUrl('ja'), 'https://muicv.com/en/dashboard/submissions');
  assert.equal(submissionsUrl('en_US'), 'https://muicv.com/en/dashboard/submissions');
});
