import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fetchCmsPostBySlug,
  fetchCmsPublishedChangelog,
  fetchCmsPublishedPosts,
  fetchCmsPublishedSkills,
} from '../src/cms-content.ts';
import { getPublishedPosts, getPublishedSkills } from '../src/content-registry.ts';

test('content registry 内置核心 SEO 求职文章', () => {
  const jobsPosts = getPublishedPosts('jobs');
  assert.ok(jobsPosts.length >= 2);
  assert.ok(jobsPosts.some((p) => p.slug === 'ai-resume-tips-for-developers'));
  assert.ok(jobsPosts.some((p) => p.slug === 'english-resume-for-chinese-developers'));
  assert.deepEqual(getPublishedSkills(), []);
});

test('cms content fetch maps Payload posts into registry shape', async () => {
  const posts = await fetchCmsPublishedPosts('jobs', {
    baseUrl: 'https://cms.example.com',
    fetchImpl: async () =>
      Response.json({
        docs: [
          {
            slug: 'cms-post',
            section: 'jobs',
            status: 'published',
            title: 'CMS 文章',
            summary: '来自 Payload 的文章。',
            bodyMarkdown: '# CMS 文章',
            tags: [{ value: '校招' }],
            keywords: [{ value: 'CMS' }],
            author: 'Mui简历',
            publishedAt: '2026-05-16',
            updatedAt: '2026-05-16T12:00:00.000Z',
            seoTitle: 'CMS 文章',
            seoDescription: '来自 Payload 的文章。',
          },
        ],
      }),
  });

  const cmsPost = posts.find((post) => post.slug === 'cms-post');
  assert.ok(cmsPost);
  assert.deepEqual(cmsPost.tags, ['校招']);
});

test('cms content fetch allows caller to choose cache mode', async () => {
  let cacheMode: unknown;

  await fetchCmsPublishedPosts(undefined, {
    baseUrl: 'https://cms.example.com',
    cache: 'force-cache',
    fetchImpl: async (_url, init) => {
      cacheMode = init?.cache;
      return Response.json({ docs: [] });
    },
  });

  assert.equal(cacheMode, 'force-cache');
});

test('cms content fetch maps Payload skills into registry shape', async () => {
  const skills = await fetchCmsPublishedSkills({
    baseUrl: 'https://cms.example.com',
    fetchImpl: async () =>
      Response.json({
        docs: [
          {
            slug: 'tencent-campus-recruiting',
            status: 'published',
            title: '腾讯校园招聘 Skill',
            publisher: '腾讯招聘',
            publisherType: 'official',
            sourceUrl: 'https://join.qq.com/post.html?query=p_2&activity=1251899672503271424',
            sourceLabel: '腾讯招聘官方岗位页',
            distributionMode: 'link_only',
            appAvailability: 'link_only',
            summary: '围绕腾讯校招做岗位匹配、简历修改和模拟面试。',
            bodyMarkdown: '## 这是什么\n\n由 Payload 管理的 skill。',
            useCases: [{ value: '腾讯校招岗位匹配' }],
            tags: [{ value: '腾讯招聘' }],
            keywords: [{ value: '腾讯校园招聘 Skill' }],
            publishedAt: '2026-05-16',
            seoTitle: '腾讯校园招聘 Skill',
            seoDescription: '腾讯校园招聘 Skill 的官方来源索引。',
          },
        ],
      }),
  });

  assert.equal(skills[0]?.slug, 'tencent-campus-recruiting');
  assert.equal(skills[0]?.appAvailability, 'link_only');
  assert.deepEqual(skills[0]?.useCases, ['腾讯校招岗位匹配']);
});

test('cms content fetch returns empty when Payload is unavailable', async () => {
  const skills = await fetchCmsPublishedSkills({
    baseUrl: 'https://cms.example.com',
    fetchImpl: async () => Response.json({ errors: [{ message: 'forbidden' }] }, { status: 403 }),
  });

  assert.deepEqual(skills, []);
});

test('cms content detail returns null when Payload has no matching slug', async () => {
  const post = await fetchCmsPostBySlug('jobs', 'third-party-skills-tencent-campus-recruiting', {
    baseUrl: 'https://cms.example.com',
    fetchImpl: async () => Response.json({ docs: [] }),
  });

  assert.equal(post, null);
});

test('cms content fetch maps Payload changelog into registry shape', async () => {
  const items = await fetchCmsPublishedChangelog({
    baseUrl: 'https://cms.example.com',
    fetchImpl: async () =>
      Response.json({
        docs: [
          {
            slug: 'skill-directory-start',
            status: 'published',
            title: '新增 Skill 目录',
            version: '0.5.0',
            summary: '通过 Payload 管理 Skill 目录。',
            bodyMarkdown: '## 更新\n\n现在由 CMS 发布。',
            publishedAt: '2026-05-16',
          },
        ],
      }),
  });

  assert.equal(items[0]?.slug, 'skill-directory-start');
  assert.equal(items[0]?.version, '0.5.0');
});
