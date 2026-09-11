import assert from 'node:assert/strict';
import test from 'node:test';

import { CONTENT_LOCALES } from '../collections/content-locales.ts';
import { Posts } from '../collections/posts.ts';

test('posts 集合带 locale 字段，用于承载同一篇文章的多语言译文', () => {
  assert.equal(Posts.slug, 'posts');
  const fieldNames = Posts.fields.map((field) => ('name' in field ? field.name : ''));
  assert.ok(fieldNames.includes('locale'), '缺少 locale 字段');
  const localeField = Posts.fields.find((field) => 'name' in field && field.name === 'locale');
  assert.ok(localeField && 'defaultValue' in localeField);
  assert.equal(localeField.defaultValue, 'zh-CN');
});

test('posts 唯一约束下沉到 (locale, slug)，slug 不再全局唯一', () => {
  const slugField = Posts.fields.find((field) => 'name' in field && field.name === 'slug');
  assert.ok(slugField);
  assert.notEqual((slugField as { unique?: boolean }).unique, true, 'slug 不应再是全局唯一（各语言共享同一 slug）');

  const indexes = Posts.indexes ?? [];
  assert.equal(indexes.length, 1);
  assert.deepEqual(indexes[0]?.fields, ['locale', 'slug']);
  assert.equal(indexes[0]?.unique, true);
});

test('posts 语言枚举与 articles 共用同一份 CONTENT_LOCALES', () => {
  for (const locale of ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt', 'th', 'vi']) {
    assert.ok((CONTENT_LOCALES as readonly string[]).includes(locale));
  }
});
