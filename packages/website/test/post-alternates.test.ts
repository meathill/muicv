import assert from 'node:assert/strict';
import test from 'node:test';

import { postAlternateLanguages } from '../lib/post-alternates.ts';

const ZH_ONLY = {
  'zh-CN': [{ section: 'jobs', slug: 'ai-fraud-cheat' }],
};

test('中文独有文章只列 zh-CN（head hreflang 不再指向不存在的译文）', () => {
  const languages = postAlternateLanguages(ZH_ONLY, 'jobs', 'ai-fraud-cheat', '');
  assert.deepEqual(languages, { 'zh-CN': '/posts/jobs/ai-fraud-cheat' });
});

test('中英双语文章恰好列两条', () => {
  const languages = postAlternateLanguages(
    {
      'zh-CN': [{ section: 'product', slug: 'deepseek-v4-1-flash' }],
      en: [{ section: 'product', slug: 'deepseek-v4-1-flash' }],
    },
    'product',
    'deepseek-v4-1-flash',
    '',
  );
  assert.deepEqual(languages, {
    'zh-CN': '/posts/product/deepseek-v4-1-flash',
    en: '/en/posts/product/deepseek-v4-1-flash',
  });
});

test('同 slug 不同 section 不串台', () => {
  const languages = postAlternateLanguages(
    {
      'zh-CN': [{ section: 'jobs', slug: 'same-slug' }],
      en: [{ section: 'guide', slug: 'same-slug' }],
    },
    'jobs',
    'same-slug',
    '',
  );
  assert.deepEqual(languages, { 'zh-CN': '/posts/jobs/same-slug' });
});

test('sitemap 用法输出绝对 URL（相对路径喂爬虫是无效 alternates）', () => {
  const languages = postAlternateLanguages(ZH_ONLY, 'jobs', 'ai-fraud-cheat', 'https://muicv.com');
  assert.deepEqual(languages, { 'zh-CN': 'https://muicv.com/posts/jobs/ai-fraud-cheat' });
});

test('slug 按 encodeURIComponent 编码，与 <loc> 口径一致', () => {
  const languages = postAlternateLanguages(
    { 'zh-CN': [{ section: 'jobs', slug: 'a b' }] },
    'jobs',
    'a b',
    'https://muicv.com',
  );
  assert.deepEqual(languages, { 'zh-CN': 'https://muicv.com/posts/jobs/a%20b' });
});

test('没有任何译文记录时返回空对象（调用方决定是否省略 alternates）', () => {
  assert.deepEqual(postAlternateLanguages({}, 'jobs', 'missing', ''), {});
});
