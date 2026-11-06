import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFitScale, FIT_MAX_SCALE, FIT_MIN_SCALE, PAGE_HEIGHT } from '../lib/fit.ts';

const H = PAGE_HEIGHT;

test('computeFitScale: 半页以内不放大（差距超出可读范围）', () => {
  assert.equal(computeFitScale(0.4 * H, H), 1);
  assert.equal(computeFitScale(0.5 * H, H), 1);
});

test('computeFitScale: 0.9 页放大到接近填满', () => {
  const s = computeFitScale(0.9 * H, H);
  assert.ok(s > 1.05 && s <= FIT_MAX_SCALE, `实际 ${s}`);
});

test('computeFitScale: 正好一页不缩放', () => {
  assert.equal(computeFitScale(H, H), 1);
});

test('computeFitScale: 略溢出几行收进一页', () => {
  assert.equal(computeFitScale(1.05 * H, H), 1 / 1.05);
  const s = computeFitScale(1.15 * H, H);
  assert.ok(s > FIT_MIN_SCALE && s < 0.9, `实际 ${s}`);
});

test('computeFitScale: 溢出超过可压缩范围时保持自然分页', () => {
  // 1.26 页压到一页需要 0.79 倍，低于下限
  assert.equal(computeFitScale(1.26 * H, H), 1);
  assert.equal(computeFitScale(1.5 * H, H), 1);
});

test('computeFitScale: 两页出头收进两页', () => {
  const s = computeFitScale(2.05 * H, H);
  assert.ok(s > 0.95 && s < 1, `实际 ${s}`);
});

test('computeFitScale: 2.8 页放大补齐第三页', () => {
  const s = computeFitScale(2.8 * H, H);
  assert.ok(s > 1 && s <= FIT_MAX_SCALE, `实际 ${s}`);
});

test('computeFitScale: 非法输入返回 1', () => {
  assert.equal(computeFitScale(0, H), 1);
  assert.equal(computeFitScale(-1, H), 1);
  assert.equal(computeFitScale(H, 0), 1);
  assert.equal(computeFitScale(Number.NaN, H), 1);
});

test('computeFitScale: 1 页附近的微小偏差不抖动', () => {
  assert.equal(computeFitScale(1.005 * H, H), 1);
  assert.equal(computeFitScale(0.995 * H, H), 1);
});
