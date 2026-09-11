import assert from 'node:assert/strict';
import test from 'node:test';
import { HsmError, hsmDelete, hsmGet, hsmPut, muirouterHsmPath } from '../src/hsm-client.ts';

const CONFIG = { baseUrl: 'https://hsm.meathill.com', secret: 'unit-test-secret' };

function withMockFetch<T>(handler: (req: Request) => Promise<Response> | Response, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input.toString(), init);
    return handler(req);
  };
  return run().finally(() => {
    globalThis.fetch = original;
  });
}

test('hsmPut 拼 URL + 带 X-HSM-Secret + JSON body', async () => {
  await withMockFetch(
    async (req) => {
      assert.equal(req.method, 'PUT');
      assert.equal(req.url, 'https://hsm.meathill.com/keys/muicv/muirouter/u_1');
      assert.equal(req.headers.get('X-HSM-Secret'), 'unit-test-secret');
      assert.equal(req.headers.get('Content-Type'), 'application/json');
      const body = (await req.json()) as { value: string };
      assert.equal(body.value, '{"a":1}');
      return new Response(null, { status: 200 });
    },
    async () => {
      await hsmPut(CONFIG, 'muicv/muirouter/u_1', '{"a":1}');
    },
  );
});

test('hsmPut 上限 8192', async () => {
  await assert.rejects(
    hsmPut(CONFIG, 'x', 'a'.repeat(8193)),
    (err: unknown) => err instanceof HsmError && err.code === 'value-too-long',
  );
});

test('hsmGet 200 返回 value', async () => {
  await withMockFetch(
    () =>
      new Response(JSON.stringify({ value: 'mr_at_xxx' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    async () => {
      const v = await hsmGet(CONFIG, 'muicv/muirouter/u_1');
      assert.equal(v, 'mr_at_xxx');
    },
  );
});

test('hsmGet 404 返回 null', async () => {
  await withMockFetch(
    () => new Response('not found', { status: 404 }),
    async () => {
      const v = await hsmGet(CONFIG, 'missing');
      assert.equal(v, null);
    },
  );
});

test('hsmGet 403 抛 HsmError', async () => {
  await withMockFetch(
    () => new Response('wrong secret', { status: 403 }),
    async () => {
      await assert.rejects(hsmGet(CONFIG, 'p'), (err: unknown) => err instanceof HsmError && err.status === 403);
    },
  );
});

test('hsmDelete 204 / 404 都视为成功', async () => {
  await withMockFetch(
    () => new Response(null, { status: 204 }),
    () => hsmDelete(CONFIG, 'p'),
  );
  await withMockFetch(
    () => new Response(null, { status: 404 }),
    () => hsmDelete(CONFIG, 'p'),
  );
});

test('hsmGet 网络错误抛 network code', async () => {
  await withMockFetch(
    () => {
      throw new Error('econnrefused');
    },
    async () => {
      await assert.rejects(hsmGet(CONFIG, 'p'), (err: unknown) => err instanceof HsmError && err.code === 'network');
    },
  );
});

test('muirouterHsmPath 把非 alnum 字符替换掉', () => {
  assert.equal(muirouterHsmPath('user_123'), 'muicv/muirouter/user_123');
  assert.equal(muirouterHsmPath('a:b/c'), 'muicv/muirouter/a_b_c');
});
