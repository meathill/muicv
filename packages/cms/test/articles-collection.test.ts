import assert from 'node:assert/strict';
import test from 'node:test';

import { ARTICLE_LOCALES, ARTICLE_SITES, Articles } from '../collections/articles.ts';

test('articles 集合面向多站点博客', () => {
  assert.equal(Articles.slug, 'articles');
  const fieldNames = Articles.fields.map((field) => ('name' in field ? field.name : ''));
  for (const name of ['site', 'locale', 'title', 'slug', 'status', 'summary', 'bodyMarkdown', 'publishedAt']) {
    assert.ok(fieldNames.includes(name), `缺少字段 ${name}`);
  }
});

test('articles 复合唯一索引覆盖 site + locale + slug', () => {
  const indexes = Articles.indexes ?? [];
  assert.equal(indexes.length, 1);
  assert.deepEqual(indexes[0]?.fields, ['site', 'locale', 'slug']);
  assert.equal(indexes[0]?.unique, true);
});

test('articles 站点与语言枚举覆盖现有项目', () => {
  for (const site of ['muicv', 'dyqr', 'taomenu']) {
    assert.ok((ARTICLE_SITES as readonly string[]).includes(site));
  }
  for (const locale of ['en', 'zh-CN', 'fr', 'es', 'pt', 'th', 'vi', 'ja']) {
    assert.ok((ARTICLE_LOCALES as readonly string[]).includes(locale));
  }
});
