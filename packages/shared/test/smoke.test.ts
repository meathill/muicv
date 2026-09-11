import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResumeJson } from '../src/index.ts';

test('shared 包可被导入（类型）', () => {
  const resumeJson: ResumeJson = {
    version: 1,
    basicInfo: {},
    lastUpdatedAt: new Date(0).toISOString(),
  };

  assert.equal(resumeJson.version, 1);
});
