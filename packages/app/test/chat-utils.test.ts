import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyError,
  cryptoRandomId,
  isChatSubmitHotkey,
  resolveWorkspacePath,
  safeParseJson,
  stripAttachmentFooter,
} from '../src/renderer/components/chat-utils.ts';

test('classifyError 空字符串 / NOT_LOGGED_IN → plain', () => {
  assert.equal(classifyError(''), 'plain');
  assert.equal(classifyError('NOT_LOGGED_IN'), 'plain');
});

test('classifyError NO_PROFILE → no-profile', () => {
  assert.equal(classifyError('NO_PROFILE'), 'no-profile');
});

test('classifyError muirouter / 402 / no-muirouter-link / byok → ai-not-configured', () => {
  assert.equal(classifyError('no-muirouter-link'), 'ai-not-configured');
  assert.equal(classifyError('upstream returned 402'), 'ai-not-configured');
  assert.equal(classifyError('muirouter not bound'), 'ai-not-configured');
  assert.equal(classifyError('需要 BYOK'), 'ai-not-configured');
});

test('classifyError 大小写不敏感', () => {
  assert.equal(classifyError('Muirouter not configured'), 'ai-not-configured');
});

test('classifyError 任意其它字符串 → plain', () => {
  assert.equal(classifyError('something exploded'), 'plain');
  assert.equal(classifyError('500 Internal'), 'plain');
});

test('safeParseJson 合法 JSON → 解析后的对象', () => {
  assert.deepEqual(safeParseJson('{"a":1}'), { a: 1 });
  assert.deepEqual(safeParseJson('[1,2,3]'), [1, 2, 3]);
});

test('safeParseJson 非法 JSON → 原样字符串', () => {
  assert.equal(safeParseJson('{not json'), '{not json');
  assert.equal(safeParseJson(''), '');
});

test('cryptoRandomId 返回 UUID 字符串', () => {
  const id = cryptoRandomId();
  assert.equal(typeof id, 'string');
  // RFC4122 v4 形如 xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('cryptoRandomId 多次调用产生不同值', () => {
  const a = cryptoRandomId();
  const b = cryptoRandomId();
  assert.notEqual(a, b);
});

test('resolveWorkspacePath 已经是绝对路径（POSIX）→ 原样返回', () => {
  assert.equal(resolveWorkspacePath('/Users/me/work', '/etc/hosts'), '/etc/hosts');
});

test('resolveWorkspacePath 已经是绝对路径（Windows）→ 原样返回', () => {
  assert.equal(resolveWorkspacePath('C:\\Users\\me', 'D:/Other/file.md'), 'D:/Other/file.md');
  assert.equal(resolveWorkspacePath('C:\\Users\\me', 'D:\\Other\\file.md'), 'D:\\Other\\file.md');
});

test('resolveWorkspacePath 相对路径 + POSIX workspace → 拼接 /', () => {
  assert.equal(resolveWorkspacePath('/Users/me/work', 'versions/g.md'), '/Users/me/work/versions/g.md');
});

test('resolveWorkspacePath workspace 末尾带 / → 不会出现 //', () => {
  assert.equal(resolveWorkspacePath('/Users/me/work/', 'versions/g.md'), '/Users/me/work/versions/g.md');
});

test('resolveWorkspacePath 相对路径前缀 / 会被剥掉，避免拼成绝对路径', () => {
  assert.equal(
    resolveWorkspacePath('/Users/me/work', '/versions/g.md'),
    // '/versions/g.md' 被 isPosixAbs 当成绝对路径直接返回
    '/versions/g.md',
  );
});

test('resolveWorkspacePath 相对路径 + Windows workspace → 拼接 \\', () => {
  assert.equal(resolveWorkspacePath('C:\\Users\\me\\work', 'versions/g.md'), 'C:\\Users\\me\\work\\versions/g.md');
});

test('resolveWorkspacePath workspace 为 null 时原样返回', () => {
  assert.equal(resolveWorkspacePath(null, 'versions/g.md'), 'versions/g.md');
});

test('resolveWorkspacePath 空路径直接返回', () => {
  assert.equal(resolveWorkspacePath('/Users/me/work', ''), '');
});

test('isChatSubmitHotkey: 回车（Enter）发送', () => {
  assert.equal(isChatSubmitHotkey({ key: 'Enter' }), true);
  assert.equal(isChatSubmitHotkey({ key: 'Enter', shiftKey: false }), true);
});

test('isChatSubmitHotkey: Shift + Enter 换行（不发送）', () => {
  assert.equal(isChatSubmitHotkey({ key: 'Enter', shiftKey: true }), false);
});

test('isChatSubmitHotkey: IME 中文输入合成中（isComposing / keyCode 229）不发送', () => {
  assert.equal(isChatSubmitHotkey({ key: 'Enter', isComposing: true }), false);
  assert.equal(isChatSubmitHotkey({ key: 'Enter', keyCode: 229 }), false);
  assert.equal(isChatSubmitHotkey({ key: 'Enter', isComposing: true, keyCode: 229 }), false);
});

test('isChatSubmitHotkey: 其它按键不发送', () => {
  assert.equal(isChatSubmitHotkey({ key: 'a' }), false);
  assert.equal(isChatSubmitHotkey({ key: 'Tab' }), false);
  assert.equal(isChatSubmitHotkey({ key: 'Escape' }), false);
});

test('stripAttachmentFooter: 无附件 footer 时原样返回', () => {
  assert.equal(stripAttachmentFooter('hello world'), 'hello world');
  assert.equal(stripAttachmentFooter(''), '');
});

test('stripAttachmentFooter: 剥除末尾附件段', () => {
  const raw = '请帮我优化这份简历\n\n---\n[附件]\n- inbox/2026-resume.pdf（PDF）';
  assert.equal(stripAttachmentFooter(raw), '请帮我优化这份简历');
});

test('stripAttachmentFooter: 纯附件消息（content 直接以 --- 开头）也要剥干净', () => {
  // 生成端「只发附件不打字」时去掉了前导 \n\n，这里必须同样命中
  const raw = '---\n[附件]\n- inbox/2026-resume.pdf（PDF）';
  assert.equal(stripAttachmentFooter(raw), '');
});

test('stripAttachmentFooter: footer 之后的 trailing 换行一并清掉', () => {
  assert.equal(stripAttachmentFooter('你好\n\n---\n[附件]\n- a.png（图像）\n'), '你好');
});
