import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeUpsertArticlePayload, upsertArticleInputSchema } from '../mcp/article-input.ts';
import {
  buildArticlePayload,
  extractMarkdownExcerpt,
  extractMarkdownTitle,
  parseDyqrSiteContent,
  parseMuiApiExport,
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
  assert.deepEqual(payload.sources, []);
  assert.equal(payload._status, 'published');
  assert.equal(payload.seoTitle, 'Manage links with AI');
  assert.ok(payload.summary.length > 0);
});

test('parseMuiApiExport 解析完整 metadata 导出并过滤残缺条目', () => {
  const articles = parseMuiApiExport({
    articles: [
      {
        locale: 'zh-CN',
        slug: 'gpt-5-6',
        title: 'GPT-5.6 发布',
        summary: 'GPT-5.6 模型介绍与价格。',
        bodyMarkdown: '# GPT-5.6 发布\n\n正文内容。',
        tags: ['GPT', '调价'],
        keywords: ['GPT-5.6 价格'],
        sources: [
          { label: 'OpenAI 官方公告', url: 'https://openai.com/blog' },
          { label: '', url: 'https://example.com' },
          'garbage',
        ],
        sourcePublishedAt: '2026-06-28T00:00:00.000Z',
        readingMinutes: 4,
        author: 'MuiRouter',
        publishedAt: '2026-07-02T00:00:00.000Z',
        seoTitle: 'GPT-5.6 发布 - MuiRouter',
        seoDescription: 'GPT-5.6 模型介绍与价格。',
      },
      { locale: 'zh-CN', slug: '', title: '缺 slug' },
      'garbage',
    ],
  });

  assert.equal(articles.length, 1);
  const article = articles[0];
  assert.equal(article?.slug, 'gpt-5-6');
  assert.equal(article?.status, 'published');
  assert.equal(article?.onConflict, 'update');
  assert.deepEqual(article?.sources, [{ label: 'OpenAI 官方公告', url: 'https://openai.com/blog' }]);
  assert.equal(article?.sourcePublishedAt, '2026-06-28T00:00:00.000Z');
  assert.equal(article?.readingMinutes, 4);
});

test('parseMuiApiExport 输出通过 schema 校验并归一化新字段', () => {
  const [article] = parseMuiApiExport({
    articles: [
      {
        locale: 'en',
        slug: 'claude-opus-5',
        title: 'Claude Opus 5',
        summary: 'Pricing and benchmarks.',
        bodyMarkdown: '# Claude Opus 5\n\nBody.',
        tags: ['Claude'],
        sources: [{ label: 'Anthropic', url: 'https://anthropic.com/news' }],
        readingMinutes: 6,
        publishedAt: '2026-05-20T00:00:00.000Z',
      },
    ],
  });
  assert.ok(article);

  const payload = normalizeUpsertArticlePayload(upsertArticleInputSchema.parse(article));
  assert.deepEqual(payload.sources, [{ label: 'Anthropic', url: 'https://anthropic.com/news' }]);
  assert.equal(payload.readingMinutes, 6);
  assert.equal(payload.seoTitle, 'Claude Opus 5');
  assert.equal(payload.sourcePublishedAt, undefined);
});

test('parseMuiApiExport 空入参返回空数组', () => {
  assert.deepEqual(parseMuiApiExport(null), []);
  assert.deepEqual(parseMuiApiExport({}), []);
  assert.deepEqual(parseMuiApiExport({ articles: 'not-array' }), []);
});
