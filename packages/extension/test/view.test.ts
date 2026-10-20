import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EXTENSION_LOCALES, LOCALE_MESSAGES, setFallbackLocale, toChromeMessages } from '../src/i18n.ts';
import { mockState } from '../src/popup/mock.ts';
import { costHint, esc, render } from '../src/popup/view.ts';

const PAGE = { url: 'https://a.com/x', title: '<b>T</b>', markdown: 'm', jsonLd: [], links: [] };

describe('popup 渲染', () => {
  it('转义页面标题', () => {
    setFallbackLocale('zh_CN');
    assert.equal(esc('<a href="x">'), '&#60;a href=&#34;x&#34;&#62;');
    assert.doesNotMatch(render({ kind: 'ready', page: PAGE, visibility: 'public', balance: 1 }), /<b>T<\/b>/);
  });

  it('计费说明随公共 / 私藏切换', () => {
    setFallbackLocale('zh_CN');
    assert.match(costHint(PAGE, 'public'), /识别到岗位就免费/);
    assert.match(costHint(PAGE, 'private'), /私藏只有你自己看得到/);
  });

  it('结果页展示新增 / 重复 / 奖励 / 链接（中文）', () => {
    setFallbackLocale('zh_CN');
    const html = render(mockState('result'));
    assert.match(html, /识别到 3 个岗位/);
    assert.match(html, /新增 2 · 重复 1/);
    assert.match(html, /奖励 \+2,500/);
    assert.match(html, /本次免费/);
    assert.match(html, /仅限 欧洲/);
    assert.match(html, /href="https:\/\/muicv\.com\/jobs\/demo-1"/);
  });

  it('英文界面：文案与地点都用英文', () => {
    setFallbackLocale('en');
    const html = render(mockState('result', 'en'));
    assert.match(html, /Found 3 job\(s\)/);
    assert.match(html, /Remote – Europe/);
    assert.doesNotMatch(html, /仅限/);
    assert.match(render(mockState('empty', 'en')), /Charged 42/);
    assert.match(render(mockState('queued', 'en')), /close the popup/);
  });
});

describe('i18n 文案', () => {
  it('所有语言的 key 与英文一致，商店描述 ≤132 字符', () => {
    const keys = Object.keys(LOCALE_MESSAGES.en ?? {}).sort();
    for (const locale of EXTENSION_LOCALES) {
      const messages: Record<string, string> = LOCALE_MESSAGES[locale] ?? {};
      assert.deepEqual(Object.keys(messages).sort(), keys, locale);
      assert.ok((messages.extDescription ?? '').length <= 132, locale);
      assert.ok((messages.extName ?? '').length <= 45, locale);
    }
  });

  it('{0} 占位符转成 chrome placeholders，$ 转义', () => {
    assert.deepEqual(toChromeMessages({ a: 'Found {0} of {1} ($)' }), {
      a: { message: 'Found $P0$ of $P1$ ($$)', placeholders: { p0: { content: '$1' }, p1: { content: '$2' } } },
    });
  });
});
