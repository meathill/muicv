import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildConnectRedirect, connectTarget } from '../lib/connect-redirect.ts';

describe('connectTarget', () => {
  it('允许桌面端与扩展 identity 回跳', () => {
    assert.equal(connectTarget('muicv://callback'), 'desktop');
    assert.equal(connectTarget('https://ebcbcccknlcaigkgkcoceagpmecjojcg.chromiumapp.org/callback'), 'extension');
    assert.equal(
      connectTarget('https://0123456789abcdef0123456789abcdef01234567.extensions.allizom.org/callback'),
      'extension',
    );
  });
  it('拒绝其它地址', () => {
    for (const bad of [
      'https://evil.com/',
      'http://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/',
      'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org.evil.com/',
      'https://user@abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/',
      'https://a.b.chromiumapp.org/',
      'javascript:alert(1)',
      '',
    ]) {
      assert.equal(connectTarget(bad), null, bad);
    }
  });
  it('拼接 state 和 key', () => {
    assert.equal(buildConnectRedirect('muicv://callback', 's t', 'mui_x'), 'muicv://callback?state=s%20t&key=mui_x');
  });
});
