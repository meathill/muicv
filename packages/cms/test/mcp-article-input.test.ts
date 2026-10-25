import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeCreateArticleInput,
  normalizeGetArticleInput,
  normalizeUpsertArticleInput,
} from '../mcp/article-input.ts';

const NOW = new Date('2026-10-25T12:00:00.000Z');

test('normalizeCreateArticleInput 补齐 Payload articles 默认值', () => {
  const input = normalizeCreateArticleInput(
    {
      site: 'gamebook',
      title: '姆伊游戏书推出“站方 AI 素材协助”计划',
      slug: 'media-assistance-for-creators',
      summary: '官方免费协助创作者生成画面、配音和视频素材。',
      bodyMarkdown: '## 正文内容',
      tags: ['AI', '游戏书'],
      keywords: ['互动小说', 'AI写作'],
    },
    NOW,
  );

  assert.equal(input.dryRun, false);
  assert.equal(input.payload.site, 'gamebook');
  assert.equal(input.payload.locale, 'zh-CN');
  assert.equal(input.payload.slug, 'media-assistance-for-creators');
  assert.equal(input.payload.status, 'draft');
  assert.equal(input.payload.author, 'Mui团队');
  assert.equal(input.payload.publishedAt, '2026-10-25');
  assert.deepEqual(input.payload.tags, [{ value: 'AI' }, { value: '游戏书' }]);
  assert.deepEqual(input.payload.keywords, [{ value: '互动小说' }, { value: 'AI写作' }]);
});

test('normalizeUpsertArticleInput 支持指定 published 状态与 onConflict 策略', () => {
  const input = normalizeUpsertArticleInput(
    {
      site: 'muistory',
      title: '姆伊故事集多站点测试',
      slug: 'muistory-test',
      status: 'published',
      summary: '这是一篇测试文章',
      bodyMarkdown: '# 测试',
      onConflict: 'update',
    },
    NOW,
  );

  assert.equal(input.dryRun, false);
  assert.equal(input.onConflict, 'update');
  assert.equal(input.payload.status, 'published');
  assert.equal(input.payload._status, 'published');
});

test('normalizeGetArticleInput 解析 site, slug 和 locale', () => {
  const input = normalizeGetArticleInput({
    site: 'gamebook',
    slug: 'media-assistance-for-creators',
  });

  assert.equal(input.site, 'gamebook');
  assert.equal(input.slug, 'media-assistance-for-creators');
  assert.equal(input.locale, 'zh-CN');
});
