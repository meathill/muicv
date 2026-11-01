import assert from 'node:assert/strict';
import test from 'node:test';

import { transform } from '../node_modules/@payloadcms/drizzle/dist/transform/read/index.js';

test('drizzle transform 对 date 字段具有防御性容错，不会因非法或脏数据崩溃', () => {
  const dummyAdapter = {
    payload: {
      config: {
        localization: false,
      },
      blocks: {},
    },
    tableNameMap: new Map(),
  } as unknown as Parameters<typeof transform>[0]['adapter'];

  const fields = [
    { name: 'validIso', type: 'date' },
    { name: 'spaceSeparatedDate', type: 'date' },
    { name: 'emptyStringDate', type: 'date' },
    { name: 'invalidDateString', type: 'date' },
    { name: 'nullDate', type: 'date' },
  ] as unknown as Parameters<typeof transform>[0]['fields'];

  const rawData = {
    id: 1,
    validIso: '2026-10-27T15:26:50.000Z',
    spaceSeparatedDate: '2026-10-27 15:26:50',
    emptyStringDate: '',
    invalidDateString: 'not-a-valid-date',
    nullDate: null,
  };

  assert.doesNotThrow(() => {
    const result = transform({
      adapter: dummyAdapter,
      config: dummyAdapter.payload.config as unknown as Parameters<typeof transform>[0]['config'],
      data: rawData,
      fields,
      parentIsLocalized: false,
      tableName: 'test_table',
    }) as Record<string, unknown>;

    assert.equal(result.validIso, '2026-10-27T15:26:50.000Z');
    // 非法日期不导致崩溃，安全兜底保留原值
    assert.equal(result.emptyStringDate, '');
    assert.equal(result.invalidDateString, 'not-a-valid-date');
    assert.equal(result.nullDate, null);
  });
});
