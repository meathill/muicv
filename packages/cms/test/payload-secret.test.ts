import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePayloadSecret } from '../utilities/resolve-secret.ts';

test('resolvePayloadSecret 优先使用 Cloudflare Worker env 中的 PAYLOAD_SECRET', () => {
  const secret = resolvePayloadSecret(
    { PAYLOAD_SECRET: 'cf-secret-token-xyz' },
    { PAYLOAD_SECRET: 'process-secret-token-abc' },
  );
  assert.equal(secret, 'cf-secret-token-xyz');
});

test('resolvePayloadSecret 当 Cloudflare env 缺失时回退到 process.env', () => {
  const secret = resolvePayloadSecret(null, { PAYLOAD_SECRET: 'process-secret-token-abc' });
  assert.equal(secret, 'process-secret-token-abc');
});

test('resolvePayloadSecret 当两者均缺失时返回空字符串', () => {
  const secret = resolvePayloadSecret(null, {});
  assert.equal(secret, '');
});
