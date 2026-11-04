import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupeArtifactRefs } from '../src/shared/artifact-refs.ts';
import type { ArtifactRef } from '../src/shared/types.ts';

const RESUME: ArtifactRef = {
  kind: 'resume-version',
  path: '/workspace/versions/frontend.md',
  title: 'frontend.md',
  source: 'write',
};

test('同一条回复多次编辑同一文件时，保留首次出现的位置和最后一次引用', () => {
  const project: ArtifactRef = {
    kind: 'project',
    path: '/workspace/projects/mui-gamebook.md',
    title: 'mui-gamebook.md',
    source: 'write',
  };
  const lastEdit = { ...RESUME, title: '更新后的简历' };

  assert.deepEqual(dedupeArtifactRefs([RESUME, RESUME, project, RESUME, lastEdit]), [lastEdit, project]);
});

test('参考素材和写入产物分别去重，同名但路径不同的文件都保留', () => {
  const read: ArtifactRef = { ...RESUME, source: 'read' };
  const anotherResume = { ...RESUME, path: '/workspace/archive/versions/frontend.md' };

  assert.deepEqual(dedupeArtifactRefs([read, RESUME, anotherResume, read, RESUME]), [read, RESUME, anotherResume]);
});
