import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { browserName, connectUrl, parseCallback, randomState } from '../src/auth.ts';

const REDIRECT = 'https://ebcbcccknlcaigkgkcoceagpmecjojcg.chromiumapp.org/callback';
const KEY = `mui_${'a'.repeat(32)}`;

describe('extension auth', () => {
  it('按界面语言选择中文 / 英文授权页', () => {
    assert.match(
      connectUrl('s1234567', REDIRECT, 'zh_CN', 'Chrome'),
      /^https:\/\/muicv\.com\/connect\?state=s1234567&redirect=/,
    );
    assert.match(connectUrl('s1234567', REDIRECT, 'ja', 'Edge'), /^https:\/\/muicv\.com\/en\/connect\?.*app=Edge$/);
  });
  it('校验 state、来源和 key 格式', () => {
    const state = randomState();
    assert.equal(state.length, 48);
    assert.equal(parseCallback(`${REDIRECT}?state=${state}&key=${KEY}`, REDIRECT, state), KEY);
    assert.equal(parseCallback(`${REDIRECT}?state=other&key=${KEY}`, REDIRECT, state), null);
    assert.equal(parseCallback(`https://evil.com/callback?state=${state}&key=${KEY}`, REDIRECT, state), null);
    assert.equal(parseCallback(`${REDIRECT}?state=${state}&key=bad`, REDIRECT, state), null);
  });
  it('识别浏览器', () => {
    assert.equal(browserName('Mozilla/5.0 ... Firefox/131.0'), 'Firefox');
    assert.equal(browserName('... Chrome/130.0 Safari/537.36 Edg/130.0'), 'Edge');
    assert.equal(browserName('... Chrome/130.0 Safari/537.36'), 'Chrome');
  });
});
