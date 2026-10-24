import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertTemplateResumeData,
  isJsonTemplateId,
  isTemplateId,
  isTemplateLang,
  pickLang,
  TEMPLATE_IDS,
  TEMPLATE_RESUME_SCHEMA_VERSION,
  type TemplateResumeData,
} from '../src/index.ts';

function sample(): TemplateResumeData {
  return {
    schemaVersion: 1,
    name: { zh: '李 凌', en: 'Ling Wei' },
    title: { zh: '产品设计师', en: 'Product Designer' },
    contact: { location: { zh: '上海', en: 'Shanghai' }, email: 'a@b.com' },
    summary: { zh: '一句话', en: 'One line.' },
    experience: [
      {
        org: { zh: '字节', en: 'ByteDance' },
        role: { zh: '实习生', en: 'Intern' },
        period: '2025',
        bullets: { zh: ['x', 'y'], en: ['x', 'y'] },
      },
    ],
    education: [{ school: { zh: '清华', en: 'Tsinghua' }, degree: { zh: '硕士', en: 'MS' }, period: '2023-2026' }],
    projects: [{ name: { zh: '项目', en: 'Project' }, desc: { zh: '描述', en: 'desc' } }],
    skills: { code: ['TS'] },
  };
}

test('pickLang 取双语', () => {
  assert.equal(pickLang({ zh: '中', en: 'CN' }, 'zh'), '中');
  assert.equal(pickLang({ zh: '中', en: 'CN' }, 'en'), 'CN');
});

test('pickLang 单语直通', () => {
  assert.equal(pickLang('单语', 'zh'), '单语');
  assert.equal(pickLang('单语', 'en'), '单语');
});

test('pickLang 缺一边自动 fallback', () => {
  assert.equal(pickLang({ zh: '只有中文' } as never, 'en'), '只有中文');
  assert.equal(pickLang({ en: 'only en' } as never, 'zh'), 'only en');
});

test('pickLang null / undefined → 空串', () => {
  assert.equal(pickLang(undefined, 'zh'), '');
});

test('pickLang 数组双语', () => {
  assert.deepEqual(pickLang({ zh: ['a'], en: ['b'] }, 'zh'), ['a']);
});

test('assertTemplateResumeData: 合法样本通过', () => {
  assert.doesNotThrow(() => assertTemplateResumeData(sample()));
});

test('assertTemplateResumeData: schemaVersion 错', () => {
  const bad = { ...sample(), schemaVersion: 2 };
  assert.throws(() => assertTemplateResumeData(bad), /schemaVersion/);
});

test('assertTemplateResumeData: experience.bullets 必须为 string[]', () => {
  const bad = sample();
  // @ts-expect-error 测试坏数据
  bad.experience[0].bullets = { zh: 'not-array', en: 'no' };
  assert.throws(() => assertTemplateResumeData(bad), /bullets/);
});

test('assertTemplateResumeData: 缺 name 报错', () => {
  const bad = { ...sample() } as Record<string, unknown>;
  delete bad.name;
  assert.throws(() => assertTemplateResumeData(bad));
});

test('TEMPLATE_IDS 包含 default + 6 个新模板', () => {
  assert.equal(TEMPLATE_IDS.length, 7);
  assert.ok(isTemplateId('default'));
  assert.ok(isTemplateId('t1-classic'));
  assert.ok(isTemplateId('t6-academic'));
  assert.equal(isTemplateId('t7-extra'), false);
});

test('isJsonTemplateId 排除 default', () => {
  assert.equal(isJsonTemplateId('default'), false);
  assert.ok(isJsonTemplateId('t3-sidebar'));
});

test('isTemplateLang', () => {
  assert.ok(isTemplateLang('zh'));
  assert.ok(isTemplateLang('en'));
  assert.equal(isTemplateLang('jp'), false);
});

test('schema version 常量与样本一致', () => {
  assert.equal(sample().schemaVersion, TEMPLATE_RESUME_SCHEMA_VERSION);
});
