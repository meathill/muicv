import assert from 'node:assert/strict';
import test from 'node:test';

import app from '../src/app.ts';

const FAKE_API_KEY = `mui_${'a'.repeat(32)}`;
const FAKE_USER_ID = 'u_test';
const AUTH = { authorization: `Bearer ${FAKE_API_KEY}` };
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;

type MediaRow = {
  r2Key: string;
};

type MockOpts = {
  mediaRows?: MediaRow[];
  photoRows?: MediaRow[];
};

function mockEnv(opts: MockOpts = {}): unknown {
  const r2 = new Map<string, { body: Uint8Array; meta: unknown }>();
  const insertedMedia: Array<{ args: unknown[] }> = [];
  const deletedKeys: string[] = [];
  let deletedMediaRows = false;
  let deletedPhotoRows = false;

  type Stmt = {
    bind: (..._a: unknown[]) => Stmt;
    run: () => Promise<unknown>;
    first: <T>() => Promise<T | null>;
    all: <T>() => Promise<{ results: T[] }>;
  };

  const makeStmt = (sql: string): Stmt => {
    let bound: unknown[] = [];
    const stmt: Stmt = {
      bind: (...args: unknown[]) => {
        bound = args;
        return stmt;
      },
      run: async () => {
        if (/DELETE FROM mediaUpload/i.test(sql)) deletedMediaRows = true;
        if (/DELETE FROM photoUpload/i.test(sql)) deletedPhotoRows = true;
        return { success: true };
      },
      first: async <T>(): Promise<T | null> => {
        if (/FROM apiKey/i.test(sql)) {
          return { id: 'k', userId: FAKE_USER_ID, revokedAt: null } as T;
        }
        if (/INSERT INTO mediaUpload/i.test(sql)) {
          insertedMedia.push({ args: bound });
          return { id: 42 } as T;
        }
        return null;
      },
      all: async <T>(): Promise<{ results: T[] }> => {
        if (/FROM mediaUpload/i.test(sql)) {
          return { results: (opts.mediaRows ?? []) as T[] };
        }
        if (/FROM photoUpload/i.test(sql)) {
          return { results: (opts.photoRows ?? []) as T[] };
        }
        return { results: [] };
      },
    };
    return stmt;
  };

  return {
    __insertedMedia: insertedMedia,
    __deletedKeys: deletedKeys,
    __rowsDeleted: () => ({ media: deletedMediaRows, photo: deletedPhotoRows }),
    MUICV_API_DB: { prepare: (sql: string) => makeStmt(sql) },
    BROWSER: { fetch: async () => new Response('') },
    MUICV_KV: { put: async () => {}, get: async () => null, delete: async () => {} },
    MUICV_RESUME_BLOB: { put: async () => ({}), get: async () => null, delete: async () => {} },
    MUICV_PHOTOS: {
      put: async (key: string, body: ArrayBuffer, opt: unknown) => {
        r2.set(key, { body: new Uint8Array(body), meta: opt });
        return { key };
      },
      get: async (key: string) => r2.get(key) ?? null,
      delete: async (key: string | string[]) => {
        for (const k of Array.isArray(key) ? key : [key]) {
          deletedKeys.push(k);
          r2.delete(k);
        }
      },
    },
    RENDER_BASE_URL: 'https://muicv.com',
    PHOTOS_PUBLIC_BASE_URL: 'https://i.muicv.com',
    PREVIEW_PUBLIC_BASE_URL: 'https://muicv.com',
  };
}

test('POST /upload/media 缺 Authorization → 401', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(64)], { type: 'image/jpeg' }), 'a.jpg');
  const res = await app.request('/upload/media', { method: 'POST', body: fd }, mockEnv(), ctx);
  assert.equal(res.status, 401);
});

test('POST /upload/media 类型不支持 → 400', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(8)], { type: 'application/zip' }), 'a.zip');
  const res = await app.request('/upload/media', { method: 'POST', headers: AUTH, body: fd }, mockEnv(), ctx);
  assert.equal(res.status, 400);
});

test('POST /upload/media 文件太大 → 400', async () => {
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(20 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'big.pdf');
  const res = await app.request('/upload/media', { method: 'POST', headers: AUTH, body: fd }, mockEnv(), ctx);
  assert.equal(res.status, 400);
});

test('POST /upload/media 正常 → 201 + userId/media 前缀', async () => {
  const env = mockEnv() as { __insertedMedia: Array<{ args: unknown[] }> } & object;
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(128)], { type: 'audio/wav' }), 'voice.wav');
  const res = await app.request('/upload/media', { method: 'POST', headers: AUTH, body: fd }, env, ctx);
  assert.equal(res.status, 201);
  const body = (await res.json()) as {
    id: number;
    url: string;
    key: string;
    kind: string;
    contentType: string;
    size: number;
  };
  assert.equal(body.id, 42);
  assert.ok(body.key.startsWith(`${FAKE_USER_ID}/media/`));
  assert.ok(body.key.endsWith('.wav'));
  assert.equal(body.kind, 'audio');
  assert.equal(body.contentType, 'audio/wav');
  assert.equal(body.size, 128);
  assert.equal(body.url, `https://i.muicv.com/${body.key}`);

  const audit = env.__insertedMedia[0]?.args ?? [];
  assert.equal(audit[0], FAKE_USER_ID);
  assert.equal(audit[1], body.key);
  assert.equal(audit[2], body.url);
  assert.equal(audit[3], 'audio');
  assert.equal(audit[4], 'audio/wav');
  assert.equal(audit[5], 128);
  assert.equal(audit[6], 'voice.wav');
});

test('DELETE /upload/media 删除通用媒体和旧证件照', async () => {
  const mediaRows = [{ r2Key: `${FAKE_USER_ID}/media/a.wav` }, { r2Key: `${FAKE_USER_ID}/media/b.pdf` }];
  const photoRows = [{ r2Key: `${FAKE_USER_ID}/photo.jpg` }];
  const env = mockEnv({ mediaRows, photoRows }) as {
    __deletedKeys: string[];
    __rowsDeleted: () => { media: boolean; photo: boolean };
  } & object;

  const res = await app.request('/upload/media', { method: 'DELETE', headers: AUTH }, env, ctx);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    ok: true;
    deletedMedia: number;
    deletedPhotos: number;
    deletedObjects: number;
  };
  assert.equal(body.deletedMedia, 2);
  assert.equal(body.deletedPhotos, 1);
  assert.equal(body.deletedObjects, 3);
  assert.deepEqual(
    env.__deletedKeys,
    [...mediaRows, ...photoRows].map((row) => row.r2Key),
  );
  assert.deepEqual(env.__rowsDeleted(), { media: true, photo: true });
});
