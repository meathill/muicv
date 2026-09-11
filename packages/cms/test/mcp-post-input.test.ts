import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCreatePostInput, normalizeUpsertPostInput, slugifyTitle } from '../mcp/post-input.ts';

const NOW = new Date('2026-05-16T08:30:00.000Z');

test('normalizeCreatePostInput 补齐 Payload posts 默认值', () => {
  const input = normalizeCreatePostInput(
    {
      title: '腾讯校招就业指导怎么准备',
      slug: 'tencent-campus-career-guide',
      summary: '一篇面向校招同学的求职准备文章。',
      bodyMarkdown: '## 正文\n\n先整理素材，再准备投递。',
      tags: ['校招', '腾讯招聘'],
      keywords: ['腾讯校招', '就业指导'],
    },
    NOW,
  );

  assert.equal(input.dryRun, false);
  assert.deepEqual(input.payload, {
    title: '腾讯校招就业指导怎么准备',
    slug: 'tencent-campus-career-guide',
    section: 'jobs',
    locale: 'zh-CN',
    status: 'draft',
    _status: 'draft',
    summary: '一篇面向校招同学的求职准备文章。',
    bodyMarkdown: '## 正文\n\n先整理素材，再准备投递。',
    tags: [{ value: '校招' }, { value: '腾讯招聘' }],
    keywords: [{ value: '腾讯校招' }, { value: '就业指导' }],
    author: 'Mui简历',
    publishedAt: '2026-05-16',
    seoTitle: '腾讯校招就业指导怎么准备',
    seoDescription: '一篇面向校招同学的求职准备文章。',
  });
});

test('normalizeCreatePostInput 支持多语言译文（同 slug 不同 locale）', () => {
  const input = normalizeCreatePostInput(
    {
      title: 'DeepSeek V4.1 Flash goes multimodal',
      slug: 'deepseek-v4-1-flash-multimodal-upgrade',
      locale: 'en',
      section: 'product',
      summary: 'Our default model now understands images natively.',
      bodyMarkdown: '## What changed',
    },
    NOW,
  );

  assert.equal(input.payload.locale, 'en');
  assert.equal(input.payload.slug, 'deepseek-v4-1-flash-multimodal-upgrade');
});

test('normalizeUpsertPostInput 默认允许按 slug 更新', () => {
  const input = normalizeUpsertPostInput(
    {
      title: 'Product update',
      summary: '产品更新说明。',
      bodyMarkdown: '## 更新\n\n新增 CMS MCP。',
      section: 'product',
      status: 'published',
      dryRun: true,
    },
    NOW,
  );

  assert.equal(input.dryRun, true);
  assert.equal(input.onConflict, 'update');
  assert.equal(input.payload.slug, 'product-update');
  assert.equal(input.payload.status, 'published');
  assert.equal(input.payload._status, 'published');
});

test('slugifyTitle 对中文标题使用稳定 fallback', () => {
  assert.equal(slugifyTitle('腾讯校招就业指导', NOW), 'post-20260516-083000');
});
