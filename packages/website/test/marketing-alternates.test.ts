import assert from 'node:assert/strict';
import test from 'node:test';

import { LOCALES, LOCALIZED_ROUTES } from '../app/(zh)/(marketing)/_i18n/locale.ts';
import { alternateLanguages, pageMetadata, soloPageMetadata } from '../app/(zh)/(marketing)/_page-meta.ts';

test('alternateLanguages("/"): 9 语言齐备且映射正确', () => {
  const languages = alternateLanguages('/');
  const keys = Object.keys(languages);

  assert.deepEqual(keys, ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt', 'th', 'vi']);
  assert.equal(languages['zh-CN'], '/');
  assert.equal(languages.en, '/en');
  assert.equal(languages.ja, '/ja');
  assert.equal(languages.pt, '/pt');
});

test('alternateLanguages("/download"): 9 语言齐备且映射正确', () => {
  const languages = alternateLanguages('/download');
  const keys = Object.keys(languages);

  assert.deepEqual(keys, ['zh-CN', 'en', 'ja', 'de', 'fr', 'es', 'pt', 'th', 'vi']);
  assert.equal(languages['zh-CN'], '/download');
  assert.equal(languages.en, '/en/download');
  assert.equal(languages.pt, '/pt/download');
});

test('alternateLanguages("/templates"): 仅中英双语（与模板实际译文对齐）', () => {
  const languages = alternateLanguages('/templates');
  assert.deepEqual(languages, {
    'zh-CN': '/templates',
    en: '/en/templates',
  });
});

test('alternateLanguages("/templates/t1-classic"): 模板详情页继承双语规则', () => {
  const languages = alternateLanguages('/templates/t1-classic');
  assert.deepEqual(languages, {
    'zh-CN': '/templates/t1-classic',
    en: '/en/templates/t1-classic',
  });
});

test('pageMetadata 首页集群：各语言 self-canonical 与 hreflang 互指完全对称', () => {
  const expectedLanguages = {
    'zh-CN': '/',
    en: '/en',
    ja: '/ja',
    de: '/de',
    fr: '/fr',
    es: '/es',
    pt: '/pt',
    th: '/th',
    vi: '/vi',
    'x-default': '/',
  };

  for (const locale of LOCALES) {
    const meta = pageMetadata({
      locale,
      path: '/',
      title: { absolute: `Home ${locale}` },
      description: `Description ${locale}`,
    });
    const alternates = meta.alternates;
    assert.ok(alternates, `${locale} 应有 alternates`);

    // 1. self-canonical 保持各自语言路径
    const expectedCanonical = locale === 'zh' ? '/' : `/${locale}`;
    assert.equal(alternates.canonical, expectedCanonical, `${locale} canonical 应自指`);

    // 2. hreflang 集合必须对齐且对称（完全等于 9 语言 + x-default）
    assert.deepEqual(alternates.languages, expectedLanguages, `${locale} hreflang 集合不对称`);

    // 3. openGraph / twitter 标题纯字符串化（支持 { absolute: string }）
    assert.equal(meta.openGraph?.title, `Home ${locale}`);
    assert.equal(meta.twitter?.title, `Home ${locale}`);
  }
});

test('pageMetadata 下载页集群：各语言 self-canonical 与 hreflang 互指完全对称', () => {
  const expectedLanguages = {
    'zh-CN': '/download',
    en: '/en/download',
    ja: '/ja/download',
    de: '/de/download',
    fr: '/fr/download',
    es: '/es/download',
    pt: '/pt/download',
    th: '/th/download',
    vi: '/vi/download',
    'x-default': '/download',
  };

  for (const locale of LOCALES) {
    const meta = pageMetadata({
      locale,
      path: '/download',
      title: `Download ${locale}`,
      description: `Description ${locale}`,
    });
    const alternates = meta.alternates;
    assert.ok(alternates, `${locale} 应有 alternates`);

    const expectedCanonical = locale === 'zh' ? '/download' : `/${locale}/download`;
    assert.equal(alternates.canonical, expectedCanonical, `${locale} canonical 应自指`);
    assert.deepEqual(alternates.languages, expectedLanguages, `${locale} hreflang 集合不对称`);
  }
});

test('pageMetadata 全部 LOCALIZED_ROUTES：各语言互指对称且 self-canonical 均在 hreflang 集合中', () => {
  for (const route of LOCALIZED_ROUTES) {
    const defaultMeta = pageMetadata({
      locale: 'zh',
      path: route,
      title: `${route} zh`,
      description: `Description ${route} zh`,
    });
    const defaultLanguages = defaultMeta.alternates?.languages;
    assert.ok(defaultLanguages, `${route} 应有 languages 声明`);
    assert.equal(Object.keys(defaultLanguages).length, LOCALES.length + 1, `${route} 应包含 9 语言 + x-default`);
    assert.equal(defaultLanguages['x-default'], route, `${route} x-default 应等于默认中文路径`);

    for (const locale of LOCALES) {
      const meta = pageMetadata({
        locale,
        path: route,
        title: `${route} ${locale}`,
        description: `Description ${route} ${locale}`,
      });
      const langKey = locale === 'zh' ? 'zh-CN' : locale;

      // 各语言 hreflang 集合完全同一（对称互指）
      assert.deepEqual(
        meta.alternates?.languages,
        defaultLanguages,
        `${route} 在 ${locale} 下的 hreflang 应与其它语言一致`,
      );
      // self-canonical 必须被对应语言的 hreflang 包含
      assert.equal(
        defaultLanguages[langKey],
        meta.alternates?.canonical,
        `${route} 在 ${locale} 下的 canonical 应与 hreflang 自指一致`,
      );
    }
  }
});

test('pageMetadata 模板页：中英双语互指对称 + x-default', () => {
  const zhMeta = pageMetadata({
    locale: 'zh',
    path: '/templates',
    title: '模板库',
    description: '描述',
  });
  const enMeta = pageMetadata({
    locale: 'en',
    path: '/templates',
    title: 'Templates',
    description: 'Description',
  });

  const expectedLanguages = {
    'zh-CN': '/templates',
    en: '/en/templates',
    'x-default': '/templates',
  };

  assert.equal(zhMeta.alternates?.canonical, '/templates');
  assert.equal(enMeta.alternates?.canonical, '/en/templates');
  assert.deepEqual(zhMeta.alternates?.languages, expectedLanguages);
  assert.deepEqual(enMeta.alternates?.languages, expectedLanguages);
});

test('soloPageMetadata 单语页：不生成 hreflang languages（避免产生 404 死链）', () => {
  const meta = soloPageMetadata({
    path: '/changelog',
    title: '更新日志',
    description: '日志描述',
  });

  assert.equal(meta.alternates?.canonical, '/changelog');
  assert.equal(meta.alternates?.languages, undefined);
});
