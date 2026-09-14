import assert from 'node:assert/strict';
import test from 'node:test';

import { formatUpdaterError } from '../src/renderer/lib/updater-utils.ts';

test('formatUpdaterError: 空或 undefined 提示默认错误', () => {
  assert.equal(formatUpdaterError(), '检查更新失败，请稍后重试');
  assert.equal(formatUpdaterError(''), '检查更新失败，请稍后重试');
});

test('formatUpdaterError: GitHub Releases 缺少 latest-mac.yml 或 404 返回友好中文', () => {
  const raw404 =
    'Cannot find latest-mac.yml in the artifacts (https://github.com/meathill/muicv/releases/download/v0.5.4/latest-mac.yml): HttpError: 404 "method: GET url: https://github.com/meathill/muicv/releases/download/v0.5.4/latest-mac.yml\\n\\nPlease double check that your repo is correct. Headers: { ... } at createHttpError ...';
  assert.equal(formatUpdaterError(raw404), '未检测到新发布版本');

  const rawLatest = 'Cannot find latest.yml in artifacts';
  assert.equal(formatUpdaterError(rawLatest), '未检测到新发布版本');
});

test('formatUpdaterError: 网络故障转化为连网排查提示', () => {
  assert.equal(
    formatUpdaterError('net::ERR_INTERNET_DISCONNECTED at SimpleURLLoaderWrapper.emit'),
    '网络连接异常，请检查网络设置',
  );
  assert.equal(formatUpdaterError('getaddrinfo ENOTFOUND github.com'), '网络连接异常，请检查网络设置');
  assert.equal(formatUpdaterError('ETIMEDOUT while requesting update'), '网络连接异常，请检查网络设置');
});

test('formatUpdaterError: 权限问题转化为权限提示', () => {
  assert.equal(formatUpdaterError('EACCES: permission denied, open /tmp/update.pkg'), '更新安装权限不足');
});

test('formatUpdaterError: 代码签名不匹配转化为手动下载提示', () => {
  assert.equal(
    formatUpdaterError('Code signature verification failed: code failed to satisfy specified code requirement(s)'),
    '应用签名不一致，请手动下载覆盖安装',
  );
  assert.equal(
    formatUpdaterError('Could not verify code signature of downloaded bundle'),
    '应用签名不一致，请手动下载覆盖安装',
  );
});
