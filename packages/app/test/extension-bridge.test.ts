import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { EXTENSION_BRIDGE_MAGIC } from '@muicv/shared';

import {
  type BridgeReq,
  decidePair,
  handleBridgeRequest,
  resetBridgeAuthForTest,
  setBridgeJobHandlers,
} from '../src/main/extension-bridge.ts';

function req(partial: Partial<BridgeReq> & Pick<BridgeReq, 'method' | 'pathname'>): BridgeReq {
  return {
    search: new URLSearchParams(),
    origin: 'chrome-extension://abc',
    authorization: null,
    body: null,
    ...partial,
  };
}

afterEach(() => {
  resetBridgeAuthForTest();
  setBridgeJobHandlers({
    ingest: async () => ({ jobId: 'j1', targetPath: 'targets/x.md', status: 'queued' }),
    get: () => undefined,
    contribute: async () => ({ awarded: 0, duplicate: true }),
    generate: async () => ({ jobId: 'j1', status: 'generating' }),
  });
});

describe('extension bridge protocol', () => {
  it('health 返回 magic', async () => {
    const res = await handleBridgeRequest(req({ method: 'GET', pathname: '/health', origin: null }));
    assert.equal(res.status, 200);
    assert.equal((res.json as { magic: string }).magic, EXTENSION_BRIDGE_MAGIC);
  });

  it('网页 Origin 直接 403', async () => {
    const res = await handleBridgeRequest(req({ method: 'GET', pathname: '/health', origin: 'https://evil.example' }));
    assert.equal(res.status, 403);
  });

  it('未配对访问 /jd → 401', async () => {
    const res = await handleBridgeRequest(
      req({
        method: 'POST',
        pathname: '/jd',
        body: { capturedJd: { url: 'https://x.com/j', markdown: 'hello world enough text' } },
      }),
    );
    assert.equal(res.status, 401);
  });

  it('配对成功后可以投递 JD', async () => {
    const begin = await handleBridgeRequest(
      req({ method: 'POST', pathname: '/pair/begin', body: { nonce: 'nonce-123456' } }),
    );
    assert.equal(begin.status, 200);
    assert.equal(decidePair('nonce-123456', true), true);
    const status = await handleBridgeRequest(
      req({ method: 'GET', pathname: '/pair/status', search: new URLSearchParams({ nonce: 'nonce-123456' }) }),
    );
    const token = (status.json as { token?: string }).token;
    assert.ok(token);
    const posted = await handleBridgeRequest(
      req({
        method: 'POST',
        pathname: '/jd',
        authorization: `Bearer ${token}`,
        body: {
          capturedJd: {
            url: 'https://zhipin.com/job_detail/a.html',
            markdown: 'TypeScript 岗位描述正文足够长。',
          },
        },
      }),
    );
    assert.equal(posted.status, 200);
    assert.equal((posted.json as { jobId: string }).jobId, 'j1');
  });

  it('capturedJd 缺 markdown → 400', async () => {
    await handleBridgeRequest(req({ method: 'POST', pathname: '/pair/begin', body: { nonce: 'nonce-abcdefg' } }));
    decidePair('nonce-abcdefg', true);
    const status = await handleBridgeRequest(
      req({ method: 'GET', pathname: '/pair/status', search: new URLSearchParams({ nonce: 'nonce-abcdefg' }) }),
    );
    const token = (status.json as { token?: string }).token;
    const posted = await handleBridgeRequest(
      req({
        method: 'POST',
        pathname: '/jd',
        authorization: `Bearer ${token}`,
        body: { capturedJd: { url: 'https://x.com' } },
      }),
    );
    assert.equal(posted.status, 400);
  });
});
