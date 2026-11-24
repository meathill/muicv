import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyClick, isTemplateDetailPath, isTemplateSurfacePath } from '../lib/clarity-events.ts';

describe('isTemplateDetailPath', () => {
  it('命中中英文模板详情页', () => {
    assert.equal(isTemplateDetailPath('/templates/frontend-developer'), true);
    assert.equal(isTemplateDetailPath('/en/templates/ai-engineer'), true);
    assert.equal(isTemplateDetailPath('/es/templates/data-scientist'), true);
  });

  it('排除列表页、筛选参数与更深层级', () => {
    for (const bad of [
      '/templates',
      '/templates?category=frontend',
      '/en/templates',
      '/templates/ai-engineer/extra',
      '/posts/jobs/ai-resume-tips-for-developers',
      '/download',
      '/',
    ]) {
      assert.equal(isTemplateDetailPath(bad), false, bad);
    }
  });
});

describe('isTemplateSurfacePath', () => {
  it('列表页与详情页都算模板场景', () => {
    assert.equal(isTemplateSurfacePath('/templates'), true);
    assert.equal(isTemplateSurfacePath('/templates/ai-engineer'), true);
    assert.equal(isTemplateSurfacePath('/en/templates/ai-engineer'), true);
  });

  it('其它页面不算', () => {
    assert.equal(isTemplateSurfacePath('/'), false);
    assert.equal(isTemplateSurfacePath('/pricing'), false);
    assert.equal(isTemplateSurfacePath('/posts/jobs'), false);
    assert.equal(isTemplateSurfacePath('/download'), false);
  });
});

describe('classifyClick', () => {
  it('模板列表/详情页点下载 = 套用意图', () => {
    assert.equal(classifyClick('/download', '/templates'), 'apply_click');
    assert.equal(classifyClick('/download', '/templates/ai-engineer'), 'apply_click');
    assert.equal(classifyClick('/es/download', '/es/templates/data-scientist'), 'apply_click');
  });

  it('其它页面点下载 = download_click', () => {
    assert.equal(classifyClick('/download', '/'), 'download_click');
    assert.equal(classifyClick('/download', '/pricing'), 'download_click');
    assert.equal(classifyClick('/th/download', '/th/posts/jobs'), 'download_click');
  });

  it('注册入口记为 signup_click（与所在页无关）', () => {
    assert.equal(classifyClick('/sign-up', '/'), 'signup_click');
    assert.equal(classifyClick('/sign-up', '/templates/ai-engineer'), 'signup_click');
    assert.equal(classifyClick('/en/sign-up?next=/en/dashboard', '/en'), 'signup_click');
  });

  it('无关链接与空值返回 null', () => {
    assert.equal(classifyClick('', '/templates'), null);
    assert.equal(classifyClick('/pricing', '/'), null);
    assert.equal(classifyClick('/posts/jobs', '/templates'), null);
    // 路径片段不完整，不应命中
    assert.equal(classifyClick('/downloads', '/'), null);
    assert.equal(classifyClick('/sign-up-extra', '/'), null);
  });
});
