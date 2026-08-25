import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertTemplateResumeData,
  getSampleTemplateBySlug,
  getSampleTemplates,
  SAMPLE_RESUME_TEMPLATES,
  TEMPLATE_CATEGORIES,
} from '../src/index.ts';

test('SAMPLE_RESUME_TEMPLATES 包含 8 套高质量简历模板', () => {
  assert.equal(SAMPLE_RESUME_TEMPLATES.length, 8);
  assert.equal(TEMPLATE_CATEGORIES.length, 9); // all + 8 categories
});

test('所有 8 套模板数据均严格满足 TemplateResumeData 规范', () => {
  for (const template of SAMPLE_RESUME_TEMPLATES) {
    assert.doesNotThrow(() => assertTemplateResumeData(template.data), `模板 [${template.slug}] 数据校验未通过`);
    assert.ok(template.slug.length > 0);
    assert.ok(template.name.zh.length > 0 && template.name.en.length > 0);
    assert.ok(template.atsKeywords.length >= 5);
    assert.ok(template.highlights.zh.length >= 2);
  }
});

test('getSampleTemplates 能够按分类正确过滤', () => {
  const all = getSampleTemplates('all');
  assert.equal(all.length, 8);

  const frontend = getSampleTemplates('frontend');
  assert.equal(frontend.length, 1);
  assert.equal(frontend[0]?.slug, 'frontend-developer');

  const backend = getSampleTemplates('backend');
  assert.equal(backend.length, 1);
  assert.equal(backend[0]?.slug, 'backend-architect');
});

test('getSampleTemplateBySlug 可以按 slug 查找到模板', () => {
  const found = getSampleTemplateBySlug('ai-engineer');
  assert.ok(found);
  assert.equal(found.slug, 'ai-engineer');
  assert.equal(found.templateId, 't4-tech');

  const notFound = getSampleTemplateBySlug('non-existent');
  assert.equal(notFound, null);
});
