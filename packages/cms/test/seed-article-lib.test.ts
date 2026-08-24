import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeUpsertArticlePayload, upsertArticleInputSchema } from '../mcp/article-input.ts';
import {
  buildArticlePayload,
  extractMarkdownExcerpt,
  extractMarkdownTitle,
  parseDyqrSiteContent,
} from '../scripts/seed-article-lib.ts';

const SAMPLE_MARKDOWN = [
  '# Manage links with AI',
  '',
  'DYQR.me now helps you keep every short link tidy with AI.',
  'It suggests better titles and detects broken destinations.',
  '',
  '## Why it matters',
  '',
  '- fewer broken links',
  '- clearer analytics',
].join('\n');

test('extractMarkdownTitle 取第一个标题并去掉行内标记', () => {
  assert.equal(extractMarkdownTitle(SAMPLE_MARKDOWN), 'Manage links with AI');
  assert.equal(extractMarkdownTitle('no heading here'), '');
});

test('extractMarkdownExcerpt 跳过标题取第一段正文', () => {
  assert.equal(extractMarkdownExcerpt(SAMPLE_MARKDOWN), 'DYQR.me now helps you keep every short link tidy with AI.');
});

test('buildArticlePayload 组装出 published 文章', () => {
  const payload = buildArticlePayload(
    { slug: 'hello-world', locale: 'en', markdown: SAMPLE_MARKDOWN, createdAt: '2026-05-01T00:00:00.000Z' },
    { site: 'dyqr', author: 'DYQR.me' },
  );

  assert.equal(payload.site, 'dyqr');
  assert.equal(payload.locale, 'en');
  assert.equal(payload.slug, 'hello-world');
  assert.equal(payload.title, 'Manage links with AI');
  assert.equal(payload.status, 'published');
  assert.equal(payload.publishedAt, '2026-05-01T00:00:00.000Z');
  assert.equal(payload.seoTitle, payload.title);
});

test('parseDyqrSiteContent 过滤残缺数据', () => {
  const articles = parseDyqrSiteContent({
    blogPosts: [
      { slug: 'ok-post', lang: 'en', markdown: SAMPLE_MARKDOWN, createdAt: '2026-05-01T00:00:00.000Z' },
      { slug: '', lang: 'en', markdown: SAMPLE_MARKDOWN },
      { slug: 'no-markdown', lang: 'en' },
      'garbage',
    ],
  });

  assert.equal(articles.length, 1);
  assert.equal(articles[0]?.slug, 'ok-post');
});

test('upsertArticleInputSchema 接受 seed 输出并归一化 tags/keywords', () => {
  const draft = buildArticlePayload(
    { slug: 'hello-world', locale: 'en', markdown: SAMPLE_MARKDOWN },
    { site: 'dyqr', author: 'DYQR.me' },
  );

  const parsed = upsertArticleInputSchema.parse({ ...draft, status: 'published', seoDescription: undefined });
  const payload = normalizeUpsertArticlePayload(parsed);

  assert.deepEqual(payload.tags, []);
  assert.deepEqual(payload.keywords, []);
  assert.equal(payload._status, 'published');
  assert.equal(payload.seoTitle, 'Manage links with AI');
  assert.ok(payload.summary.length > 0);
});
