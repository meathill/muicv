import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterFilesForUpload,
  MAX_ATTACHMENTS_PER_SEND,
  MAX_IMAGES_PER_SEND,
} from '../src/renderer/components/chat-utils.ts';
import type { AttachmentRef } from '../src/shared/types.ts';

function fakeFile(name: string, size = 100, type = 'image/png'): File {
  return { name, size, type } as unknown as File;
}

function fakeImageRef(path: string): AttachmentRef {
  return {
    kind: 'image',
    path,
    name: path.split('/').pop() ?? 'pic.png',
    size: 100,
    mimeType: 'image/png',
  };
}

test('常量定义：单次发送附件最多 5 个，图片最多 4 张', () => {
  assert.equal(MAX_ATTACHMENTS_PER_SEND, 5);
  assert.equal(MAX_IMAGES_PER_SEND, 4);
});

test('单次上传 6 张图片：只接收前 4 张，超出 2 张略过并产生错误提示', () => {
  const files = [
    fakeFile('1.png'),
    fakeFile('2.png'),
    fakeFile('3.png'),
    fakeFile('4.png'),
    fakeFile('5.png'),
    fakeFile('6.png'),
  ];

  const result = filterFilesForUpload(files, {
    pendingAttachments: [],
  });

  assert.equal(result.accepted.length, 4);
  assert.deepEqual(
    result.accepted.map((f) => f.name),
    ['1.png', '2.png', '3.png', '4.png'],
  );
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? '', /单次最多上传 4 张图片，多余的 2 张已略过/);
});

test('已有 3 张图片待发送时，新传 2 张图片：只接收 1 张，超出 1 张略过', () => {
  const pending: AttachmentRef[] = [
    fakeImageRef('inbox/a.png'),
    fakeImageRef('inbox/b.png'),
    fakeImageRef('inbox/c.png'),
  ];

  const files = [fakeFile('d.png'), fakeFile('e.png')];

  const result = filterFilesForUpload(files, {
    pendingAttachments: pending,
  });

  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0]?.name, 'd.png');
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? '', /单次最多上传 4 张图片，多余的 1 张已略过/);
});

test('图片已满 4 张时，PDF / Markdown 等文本附件依然可以上传（受总附件数 5 个限制）', () => {
  const pending: AttachmentRef[] = [
    fakeImageRef('inbox/1.png'),
    fakeImageRef('inbox/2.png'),
    fakeImageRef('inbox/3.png'),
    fakeImageRef('inbox/4.png'),
  ];

  const files = [fakeFile('resume.pdf', 200, 'application/pdf'), fakeFile('extra.png', 100, 'image/png')];

  const result = filterFilesForUpload(files, {
    pendingAttachments: pending,
  });

  // resume.pdf 接收，extra.png 被截断
  assert.equal(result.accepted.length, 1);
  assert.equal(result.accepted[0]?.name, 'resume.pdf');
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0] ?? '', /单次最多上传 4 张图片/);
});
