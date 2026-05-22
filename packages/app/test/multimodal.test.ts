/**
 * Claude Code 模式下的多模态测试：
 *   - 历史里所有 user message 的图都重新内联到 input；
 *   - 越界 / 读失败保护；
 *   - imageReader 缺省时退化为纯文本（兼容老路径 / 不需要 vision 的场景）。
 *
 * 集成点：buildAgentInput(messages, { imageReader }) ——
 * applyImageAttachments 这个旧的"只对最后一条"helper 已删除，逻辑全部进
 * history.ts 一处。
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAgentInput, IMAGE_TOKEN_BUDGET } from '../src/main/agent/history.ts';
import { readAudioAsBase64, readImageAsDataUrl } from '../src/main/agent/multimodal.ts';
import type { AttachmentRef, ChatMessage } from '../src/shared/types.ts';

const WORKSPACE = '/tmp/fake-workspace';

let counter = 0;
function msg(role: ChatMessage['role'], content: string, attachments?: AttachmentRef[]): ChatMessage {
  counter += 1;
  return { id: `m-${counter}`, role, content, createdAt: counter, ...(attachments ? { attachments } : {}) };
}

function imageRef(overrides: Partial<AttachmentRef> = {}): AttachmentRef {
  return {
    path: 'inbox/20260506-143022-shot.png',
    name: 'shot.png',
    kind: 'image',
    mimeType: 'image/png',
    size: 100,
    ...overrides,
  };
}

function audioRef(overrides: Partial<AttachmentRef> = {}): AttachmentRef {
  return {
    path: 'inbox/voice-1.wav',
    name: 'voice-1.wav',
    kind: 'audio',
    mimeType: 'audio/wav',
    size: 1024,
    ...overrides,
  };
}

const fakeAudioReader = (mapping: Record<string, string | null> = {}) => {
  return async (ref: AttachmentRef): Promise<string | null> => {
    if (ref.path in mapping) return mapping[ref.path];
    return `AUDIO_${ref.path}`;
  };
};

const fakeReader = (mapping: Record<string, string | null> = {}) => {
  return async (ref: AttachmentRef): Promise<string | null> => {
    if (ref.path in mapping) return mapping[ref.path];
    return `data:${ref.mimeType};base64,FAKE_${ref.path}`;
  };
};

test('buildAgentInput 没 imageReader → user content 仍是纯字符串（兼容老路径）', async () => {
  const r = await buildAgentInput([msg('user', '你好', [imageRef()])]);
  const u = r.items[0] as { role: string; content: string };
  assert.equal(u.role, 'user');
  assert.equal(typeof u.content, 'string');
  assert.equal(u.content, '你好');
});

test('buildAgentInput 注入 imageReader → 最后一条 user 的图拼成 input_text + input_image', async () => {
  const r = await buildAgentInput([msg('user', '解析这张截图', [imageRef()])], { imageReader: fakeReader() });
  const u = r.items[0] as { content: Array<{ type: string; text?: string; image?: string }> };
  assert.ok(Array.isArray(u.content));
  assert.equal(u.content.length, 2);
  assert.equal(u.content[0]?.type, 'input_text');
  assert.equal(u.content[0]?.text, '解析这张截图');
  assert.equal(u.content[1]?.type, 'input_image');
  assert.match(u.content[1]?.image ?? '', /^data:image\/png;base64,FAKE_/);
});

test('buildAgentInput 历史里每一条带图 user 都内联（Claude Code 模式）', async () => {
  const r = await buildAgentInput(
    [
      msg('user', '看 JD', [imageRef({ path: 'inbox/jd.jpg', mimeType: 'image/jpeg' })]),
      msg('assistant', '好的，这份 JD 要 ...'),
      msg('user', '基于这个 JD 写简历', [imageRef({ path: 'inbox/sample.png' })]),
    ],
    { imageReader: fakeReader() },
  );
  assert.equal(r.items.length, 3);
  // 第 1 条 user：图被内联
  const turn1 = r.items[0] as { content: Array<{ type: string; image?: string }> };
  assert.ok(Array.isArray(turn1.content));
  assert.match(turn1.content[1]?.image ?? '', /jd\.jpg/);
  // 第 3 条 user：图也被内联
  const turn3 = r.items[2] as { content: Array<{ type: string; image?: string }> };
  assert.ok(Array.isArray(turn3.content));
  assert.match(turn3.content[1]?.image ?? '', /sample\.png/);
});

test('buildAgentInput 多张图 → 全部拼到同一条 user content', async () => {
  const r = await buildAgentInput(
    [
      msg('user', '两张图', [
        imageRef({ path: 'inbox/a.png' }),
        imageRef({ path: 'inbox/b.jpg', mimeType: 'image/jpeg' }),
      ]),
    ],
    { imageReader: fakeReader() },
  );
  const u = r.items[0] as { content: Array<{ type: string; image?: string }> };
  assert.equal(u.content.length, 3); // text + 2 image
  assert.match(u.content[1]?.image ?? '', /a\.png/);
  assert.match(u.content[2]?.image ?? '', /b\.jpg/);
});

test('buildAgentInput 文本为空时只塞 image block', async () => {
  const r = await buildAgentInput([msg('user', '', [imageRef()])], { imageReader: fakeReader() });
  const u = r.items[0] as { content: Array<{ type: string }> };
  assert.equal(u.content.length, 1);
  assert.equal(u.content[0]?.type, 'input_image');
});

test('buildAgentInput 单图读失败但还有别的好图 → 跳过坏的，文本保留', async () => {
  const reader = fakeReader({ 'inbox/missing.png': null });
  const r = await buildAgentInput(
    [msg('user', '两张', [imageRef({ path: 'inbox/ok.png' }), imageRef({ path: 'inbox/missing.png' })])],
    { imageReader: reader },
  );
  const u = r.items[0] as { content: Array<{ type: string; image?: string }> };
  assert.equal(u.content.length, 2); // text + 1 ok image
  assert.match(u.content[1]?.image ?? '', /ok\.png/);
});

test('buildAgentInput 全部图都读失败 → 退化为纯字符串 content（不留空 array）', async () => {
  const reader = async () => null;
  const r = await buildAgentInput([msg('user', '图', [imageRef()])], { imageReader: reader });
  const u = r.items[0] as { role: string; content: string };
  assert.equal(typeof u.content, 'string', '没有可用图时退化回字符串，避免空 content array');
  assert.equal(u.content, '图');
});

test('buildAgentInput 把图按 IMAGE_TOKEN_BUDGET 计入预算', async () => {
  // 1 张图占 IMAGE_TOKEN_BUDGET，budget 给 100 应该只保留最后一条
  const r = await buildAgentInput(
    [
      msg('user', '前面', [imageRef({ path: 'inbox/old.png' })]),
      msg('user', '最新', [imageRef({ path: 'inbox/new.png' })]),
    ],
    { budgetTokens: 100, imageReader: fakeReader() },
  );
  // 最新一条强制保留；前面被丢；插 ellipsis
  assert.equal(r.droppedCount, 1);
  assert.ok(r.estimatedTokens >= IMAGE_TOKEN_BUDGET);
});

test('readImageAsDataUrl 越界路径被拒绝（不读盘）', async () => {
  let called = false;
  const url = await readImageAsDataUrl(WORKSPACE, imageRef({ path: '../../../etc/passwd.png' }), async () => {
    called = true;
    return Buffer.from('x');
  });
  assert.equal(url, null);
  assert.equal(called, false, '越界应该在 read 之前拒绝');
});

test('readImageAsDataUrl 读盘失败 → 返 null（不抛）', async () => {
  const url = await readImageAsDataUrl(WORKSPACE, imageRef(), async () => {
    throw new Error('ENOENT');
  });
  assert.equal(url, null);
});

test('readImageAsDataUrl 正常路径 → data URL', async () => {
  const url = await readImageAsDataUrl(WORKSPACE, imageRef(), async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  assert.match(url ?? '', /^data:image\/png;base64,iVBORw==$/);
});

test('buildAgentInput audioReader 缺省 → 不内联音频，content 仍是纯文本', async () => {
  const r = await buildAgentInput([msg('user', '听这个', [audioRef()])]);
  const u = r.items[0] as { role: string; content: string };
  assert.equal(typeof u.content, 'string');
  assert.equal(u.content, '听这个');
});

test('buildAgentInput audioReader 提供 → 内联成 SDK audio block', async () => {
  const r = await buildAgentInput([msg('user', '请听', [audioRef()])], { audioReader: fakeAudioReader() });
  const u = r.items[0] as { role: string; content: Array<{ type: string; audio?: string; format?: string }> };
  assert.ok(Array.isArray(u.content));
  // 至少应有一个 text + 一个 audio block；Agents SDK 会再转成上游 input_audio。
  const audioBlock = u.content.find((c) => c.type === 'audio');
  assert.ok(audioBlock, '应该出现 SDK audio block');
  assert.match(audioBlock?.audio ?? '', /^AUDIO_/);
  assert.equal(audioBlock?.format, 'wav');
});

test('buildAgentInput 上传非 wav 音频 → format 按 mimeType 推导（不再硬编码 wav）', async () => {
  const cases: Array<{ mimeType: string; name: string; expected: string }> = [
    { mimeType: 'audio/mpeg', name: 'clip.mp3', expected: 'mp3' },
    { mimeType: 'audio/mp4', name: 'clip.m4a', expected: 'm4a' },
    { mimeType: 'audio/flac', name: 'clip.flac', expected: 'flac' },
    { mimeType: 'audio/ogg', name: 'clip.ogg', expected: 'ogg' },
  ];
  for (const { mimeType, name, expected } of cases) {
    const ref = audioRef({ path: `inbox/${name}`, name, mimeType });
    const r = await buildAgentInput([msg('user', '请听', [ref])], { audioReader: fakeAudioReader() });
    const u = r.items[0] as { content: Array<{ type: string; format?: string }> };
    const audioBlock = u.content.find((c) => c.type === 'audio');
    assert.equal(audioBlock?.format, expected, `${mimeType} 应推导成 ${expected}`);
  }
});

test('buildAgentInput mimeType 缺失 → 回退文件扩展名推导 format', async () => {
  const ref = audioRef({ path: 'inbox/clip.flac', name: 'clip.flac', mimeType: '' });
  const r = await buildAgentInput([msg('user', '请听', [ref])], { audioReader: fakeAudioReader() });
  const u = r.items[0] as { content: Array<{ type: string; format?: string }> };
  const audioBlock = u.content.find((c) => c.type === 'audio');
  assert.equal(audioBlock?.format, 'flac');
});

test('readAudioAsBase64 正常路径 → 裸 base64（不带 data URL 前缀）', async () => {
  const url = await readAudioAsBase64(WORKSPACE, audioRef(), async () => Buffer.from('WAV'));
  assert.equal(url, 'V0FW');
});

test('buildAgentInput audioReader 全部读失败 → 退化为纯字符串（不留空 array）', async () => {
  const r = await buildAgentInput([msg('user', '音频', [audioRef()])], {
    audioReader: async () => null,
  });
  const u = r.items[0] as { role: string; content: string };
  assert.equal(typeof u.content, 'string', '无音频可用时退化回字符串，避免空 content array');
  assert.equal(u.content, '音频');
});
