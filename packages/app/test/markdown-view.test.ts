import assert from 'node:assert/strict';
import test from 'node:test';

import { inlineHtml } from '../src/renderer/components/markdown-parser.ts';

test('inlineHtml 裸 URL 自动转换为 <a> 标签', () => {
  const input = '👉 https://muicv.com/preview/a2e3736f-d631-411b-9b4b-caa68a486426';
  const html = inlineHtml(input);
  assert.ok(html.includes('<a href="https://muicv.com/preview/a2e3736f-d631-411b-9b4b-caa68a486426"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('>https://muicv.com/preview/a2e3736f-d631-411b-9b4b-caa68a486426</a>'));
});

test('inlineHtml 裸 URL 末尾中文句号不被吸入链接', () => {
  const input = '链接在 https://muicv.com/preview/xyz。请点击查看。';
  const html = inlineHtml(input);
  assert.ok(html.includes('<a href="https://muicv.com/preview/xyz"'));
  assert.ok(html.endsWith('</a>。请点击查看。'));
});

test('inlineHtml 裸 URL 末尾英文标点不被吸入链接', () => {
  const input = 'Visit https://muicv.com/preview/xyz, or check later.';
  const html = inlineHtml(input);
  assert.ok(html.includes('<a href="https://muicv.com/preview/xyz"'));
  assert.ok(html.includes('</a>, or check later.'));
});

test('inlineHtml 标准 Markdown 链接正常解析', () => {
  const input = '请点击 [在线预览](https://muicv.com/preview/123)';
  const html = inlineHtml(input);
  assert.ok(html.includes('<a href="https://muicv.com/preview/123"'));
  assert.ok(html.includes('>在线预览</a>'));
});

test('inlineHtml 行内代码中的 URL 不被误转为 <a>', () => {
  const input = '命令参数示例 `https://example.com/api`';
  const html = inlineHtml(input);
  assert.ok(!html.includes('<a '));
  assert.ok(html.includes('<code'));
  assert.ok(html.includes('https://example.com/api</code>'));
});

test('inlineHtml 带查询参数的 URL 实体安全转义', () => {
  const input = '访问 https://example.com/search?q=test&lang=zh 查看';
  const html = inlineHtml(input);
  assert.ok(html.includes('href="https://example.com/search?q=test&amp;lang=zh"'));
  assert.ok(html.includes('>https://example.com/search?q=test&amp;lang=zh</a>'));
});
