import assert from 'node:assert/strict';
import test from 'node:test';
import type { CmsChangelogPayload } from '../mcp/changelog-input.ts';
import { CmsClient } from '../mcp/payload-client.ts';
import type { CmsPostPayload } from '../mcp/post-input.ts';
import type { CmsSkillPayload } from '../mcp/skill-input.ts';

const payload: CmsPostPayload = {
  title: '测试文章',
  slug: 'test-post',
  locale: 'zh-CN',
  section: 'jobs',
  status: 'draft',
  _status: 'draft',
  summary: '测试摘要',
  bodyMarkdown: '# 测试文章',
  tags: [],
  keywords: [],
  author: 'Mui简历',
  publishedAt: '2026-05-16',
  seoTitle: '测试文章',
  seoDescription: '测试摘要',
};

const skillPayload: CmsSkillPayload = {
  title: '腾讯校园招聘 Skill',
  slug: 'tencent-campus-recruiting',
  status: 'draft',
  _status: 'draft',
  publisher: '腾讯招聘',
  publisherType: 'official',
  distributionMode: 'hosted',
  appAvailability: 'installable',
  summary: '测试摘要',
  bodyMarkdown: '# Skill',
  useCases: [],
  tags: [],
  keywords: [],
  publishedAt: '2026-05-16',
  seoTitle: '腾讯校园招聘 Skill',
  seoDescription: '测试摘要',
};

const changelogPayload: CmsChangelogPayload = {
  title: '新增 Skill 目录和求职内容中心',
  slug: 'skill-directory-start',
  status: 'published',
  _status: 'published',
  version: '0.5.0',
  summary: '测试摘要',
  bodyMarkdown: '# Changelog',
  publishedAt: '2026-05-16',
};

test('CmsClient 使用 bearer token 调 Payload API', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    token: 'token-123',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({ docs: [{ id: 1, ...payload }] });
    },
  });

  const post = await client.findPostBySlug('test-post');

  assert.equal(post?.id, 1);
  assert.equal(requests[0]?.headers.get('Authorization'), 'Bearer token-123');
  assert.equal(
    requests[0]?.url,
    'https://cms.example.com/api/posts?depth=0&limit=1&where%5Blocale%5D%5Bequals%5D=zh-CN&where%5Bslug%5D%5Bequals%5D=test-post',
  );
});

test('findPostBySlug 按 (locale, slug) 精确定位译文', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    token: 'token-123',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({ docs: [{ id: 9, ...payload, locale: 'ja' }] });
    },
  });

  const post = await client.findPostBySlug('test-post', 'ja');

  assert.equal(post?.id, 9);
  assert.ok(requests[0]?.url.includes('where%5Blocale%5D%5Bequals%5D=ja'));
});

test('CmsClient 使用 Payload 用户 API Key 调 Payload API', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    apiKey: 'payload-api-key',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({ docs: [{ id: 1, ...payload }] });
    },
  });

  const post = await client.findPostBySlug('test-post');

  assert.equal(post?.id, 1);
  assert.equal(requests[0]?.headers.get('Authorization'), 'users API-Key payload-api-key');
});

test('CmsClient 可读写 skillExtensions collection', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    token: 'token-123',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.method === 'PATCH') {
        return Response.json({ doc: { id: 3, ...skillPayload, title: '更新后的 Skill' } });
      }
      return Response.json({ docs: [{ id: 3, ...skillPayload }] });
    },
  });

  const skill = await client.findSkillBySlug('tencent-campus-recruiting');
  const updated = await client.updateSkill(3, { ...skillPayload, title: '更新后的 Skill' });

  assert.equal(skill?.id, 3);
  assert.equal(updated.title, '更新后的 Skill');
  assert.equal(
    requests[0]?.url,
    'https://cms.example.com/api/skillExtensions?depth=0&limit=1&where%5Bslug%5D%5Bequals%5D=tencent-campus-recruiting',
  );
  assert.equal(requests[1]?.url, 'https://cms.example.com/api/skillExtensions/3');
});

test('CmsClient 可读写 changelog collection', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    token: 'token-123',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.method === 'PATCH') {
        return Response.json({ doc: { id: 4, ...changelogPayload, title: '更新后的日志' } });
      }
      return Response.json({ docs: [{ id: 4, ...changelogPayload }] });
    },
  });

  const item = await client.findChangelogBySlug('skill-directory-start');
  const updated = await client.updateChangelog(4, { ...changelogPayload, title: '更新后的日志' });

  assert.equal(item?.id, 4);
  assert.equal(updated.title, '更新后的日志');
  assert.equal(
    requests[0]?.url,
    'https://cms.example.com/api/changelog?depth=0&limit=1&where%5Bslug%5D%5Bequals%5D=skill-directory-start',
  );
  assert.equal(requests[1]?.url, 'https://cms.example.com/api/changelog/4');
});

test('CmsClient 可用邮箱密码登录并复用返回 token', async () => {
  const requests: Request[] = [];
  const client = new CmsClient({
    baseUrl: 'https://cms.example.com',
    token: '',
    email: 'editor@example.com',
    password: 'secret',
    fetchImpl: async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);

      if (request.url.endsWith('/api/users/login')) {
        return Response.json({ token: 'login-token' });
      }

      return Response.json({ doc: { id: 2, ...payload } });
    },
  });

  const post = await client.createPost(payload);

  assert.equal(post.id, 2);
  assert.equal(requests[0]?.url, 'https://cms.example.com/api/users/login');
  assert.deepEqual(await requests[0]?.json(), { email: 'editor@example.com', password: 'secret' });
  assert.equal(requests[1]?.headers.get('Authorization'), 'Bearer login-token');
  assert.equal(requests[1]?.method, 'POST');
  assert.equal(requests[1]?.headers.get('Content-Type'), 'application/json');
});
