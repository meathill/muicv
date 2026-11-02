import assert from 'node:assert/strict';
import test from 'node:test';

import { Opportunities } from '../collections/opportunities.ts';

function field(name: string) {
  return Opportunities.fields.find((f) => 'name' in f && f.name === name) as
    | { unique?: boolean; index?: boolean; defaultValue?: unknown }
    | undefined;
}

test('opportunities：dedupeKey 唯一、fingerprint / postedAt / status 有索引', () => {
  assert.equal(Opportunities.slug, 'opportunities');
  assert.equal(field('dedupeKey')?.unique, true);
  assert.equal(field('fingerprint')?.index, true);
  assert.equal(field('postedAt')?.index, true);
  assert.equal(field('status')?.defaultValue, 'published');
});

test('opportunities：匿名可读 published + expired（过期页保留存档），draft 仍隐藏', () => {
  const read = Opportunities.access?.read;
  assert.ok(read);
  const anon = read({ req: { user: null } } as never);
  assert.deepEqual(anon, { status: { in: ['published', 'expired'] } });
  assert.equal(read({ req: { user: { id: 1 } } } as never), true);
});
