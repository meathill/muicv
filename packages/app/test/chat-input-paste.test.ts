import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClipboardEvent } from 'react';
import type { ChatAttachmentsApi } from '../src/renderer/lib/use-chat-attachments.ts';
import { extractClipboardFiles, useChatInputPaste } from '../src/renderer/lib/use-chat-input-paste.ts';

test('extractClipboardFiles: null 或 undefined 返回空数组', () => {
  assert.deepEqual(extractClipboardFiles(null), []);
  assert.deepEqual(extractClipboardFiles(undefined), []);
});

test('extractClipboardFiles: 纯文本剪贴板（无 file）返回空数组', () => {
  const cd = {
    files: [] as unknown as FileList,
    items: [
      {
        kind: 'string',
        type: 'text/plain',
        getAsFile: () => null,
      },
    ] as unknown as DataTransferItemList,
  };
  assert.deepEqual(extractClipboardFiles(cd), []);
});

test('extractClipboardFiles: 现代浏览器截图（files 与 items 均有同一张图片且 lastModified 不同）只保留一份', () => {
  const fileA = new File(['image-bytes'], 'image.png', {
    type: 'image/png',
    lastModified: 1000,
  });
  const fileB = new File(['image-bytes'], 'image.png', {
    type: 'image/png',
    lastModified: 1005, // 模拟引擎动态生成 Date.now() 产生的毫秒差
  });

  const cd = {
    files: [fileA] as unknown as FileList,
    items: [
      {
        kind: 'file',
        type: 'image/png',
        getAsFile: () => fileB,
      },
    ] as unknown as DataTransferItemList,
  };

  const result = extractClipboardFiles(cd);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, 'image.png');
  assert.equal(result[0]?.size, fileA.size);
});

test('extractClipboardFiles: files 为空但 items 有文件（回退兼容）正确提取', () => {
  const fileFromItem = new File(['fallback-img'], 'screenshot.png', {
    type: 'image/png',
  });

  const cd = {
    files: [] as unknown as FileList,
    items: [
      {
        kind: 'file',
        type: 'image/png',
        getAsFile: () => fileFromItem,
      },
    ] as unknown as DataTransferItemList,
  };

  const result = extractClipboardFiles(cd);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, 'screenshot.png');
});

test('extractClipboardFiles: 多张不同文件完整保留', () => {
  const file1 = new File(['content-1'], 'a.png', { type: 'image/png' });
  const file2 = new File(['longer-content-2'], 'b.pdf', { type: 'application/pdf' });

  const cd = {
    files: [file1, file2] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  };

  const result = extractClipboardFiles(cd);
  assert.equal(result.length, 2);
  assert.equal(result[0]?.name, 'a.png');
  assert.equal(result[1]?.name, 'b.pdf');
});

test('extractClipboardFiles: files 中含有相同 name + size 的重复项时去重', () => {
  const file1 = new File(['dup'], 'photo.jpg', { type: 'image/jpeg' });
  const file2 = new File(['dup'], 'photo.jpg', { type: 'image/jpeg' });

  const cd = {
    files: [file1, file2] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  };

  const result = extractClipboardFiles(cd);
  assert.equal(result.length, 1);
});

test('useChatInputPaste: 有图片时 preventDefault 并提交 handleFiles', () => {
  let handledFiles: File[] | null = null;
  const mockAttachments = {
    handleFiles: async (files: FileList | File[]) => {
      handledFiles = Array.from(files);
    },
  } as unknown as ChatAttachmentsApi;

  const handlePaste = useChatInputPaste(mockAttachments);

  let prevented = false;
  const imgFile = new File(['img'], 'shot.png', { type: 'image/png' });
  const mockEvent = {
    clipboardData: {
      files: [imgFile] as unknown as FileList,
      items: [] as unknown as DataTransferItemList,
    },
    preventDefault: () => {
      prevented = true;
    },
  } as unknown as ClipboardEvent<HTMLTextAreaElement>;

  handlePaste(mockEvent);

  assert.equal(prevented, true);
  assert.equal(handledFiles?.length, 1);
  assert.equal(handledFiles?.[0]?.name, 'shot.png');
});

test('useChatInputPaste: 纯文本时不 preventDefault 也不调用 handleFiles', () => {
  let called = false;
  const mockAttachments = {
    handleFiles: async () => {
      called = true;
    },
  } as unknown as ChatAttachmentsApi;

  const handlePaste = useChatInputPaste(mockAttachments);

  let prevented = false;
  const mockEvent = {
    clipboardData: {
      files: [] as unknown as FileList,
      items: [
        {
          kind: 'string',
          type: 'text/plain',
          getAsFile: () => null,
        },
      ] as unknown as DataTransferItemList,
    },
    preventDefault: () => {
      prevented = true;
    },
  } as unknown as ClipboardEvent<HTMLTextAreaElement>;

  handlePaste(mockEvent);

  assert.equal(prevented, false);
  assert.equal(called, false);
});
