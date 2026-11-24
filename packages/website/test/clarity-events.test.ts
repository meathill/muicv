import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyClick, isTemplateDetailPath } from '../lib/clarity-events.ts';

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

describe('classifyClick', () => {
  it('模板卡「套用制作」记为 apply_click', () => {
    assert.equal(classifyClick('/download', '套用制作'), 'apply_click');
    assert.equal(classifyClick('/en/download', '套用制作'), 'apply_click');
  });

  it('其它下载入口记为 download_click', () => {
    assert.equal(classifyClick('/download', '下载桌面 App 一键套用'), 'download_click');
    assert.equal(classifyClick('/download', '下载桌面 app'), 'download_click');
    assert.equal(classifyClick('/th/download', 'ดาวน์โหลด'), 'download_click');
    assert.equal(classifyClick('/en/download', ''), 'download_click');
  });

  it('注册入口记为 signup_click', () => {
    assert.equal(classifyClick('/sign-up', '创建账号'), 'signup_click');
    assert.equal(classifyClick('/en/sign-up?next=/en/dashboard', 'Sign up'), 'signup_click');
  });

  it('无关链接与空值返回 null', () => {
    assert.equal(classifyClick('', '套用制作'), null);
    assert.equal(classifyClick('/pricing', '套餐'), null);
    assert.equal(classifyClick('/posts/jobs', '求职博文'), null);
    // 下载相关但路径片段不完整，不应命中
    assert.equal(classifyClick('/downloads', 'x'), null);
    assert.equal(classifyClick('/sign-up-extra', 'x'), null);
  });
});
