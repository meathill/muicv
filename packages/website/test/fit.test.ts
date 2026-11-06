import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFitScale, FIT_HEIGHT_EXP, FIT_MAX_SCALE, FIT_MIN_SCALE, PAGE_HEIGHT } from '../lib/fit.ts';

const H = PAGE_HEIGHT;

test('computeFitScale: 明显半页不放大（超出可读窗口）', () => {
  assert.equal(computeFitScale(0.5 * H, H), 1);
  assert.equal(computeFitScale(0.6 * H, H), 1);
  assert.equal(computeFitScale(0.75 * H, H), 1);
});

test('computeFitScale: 0.9 页适度放大（s^2.5 阻尼）', () => {
  const s = computeFitScale(0.9 * H, H);
  assert.ok(s > 1.02 && s <= FIT_MAX_SCALE, `实际 ${s}`);
  assert.ok(Math.abs(s - (1 / 0.9) ** (1 / FIT_HEIGHT_EXP)) < 1e-9);
});

test('computeFitScale: 正好一页不缩放', () => {
  assert.equal(computeFitScale(H, H), 1);
});

test('computeFitScale: 略溢出几行收进一页', () => {
  const s = computeFitScale(1.15 * H, H);
  assert.ok(s > FIT_MIN_SCALE && s < 0.96, `实际 ${s}`);
});

test('computeFitScale: 一页内压缩带与 x.5 边界的自然分页', () => {
  // 1.49 页是压缩带边缘（round 到 1），压到 ~0.85
  const s149 = computeFitScale(1.49 * H, H);
  assert.ok(s149 >= 0.84 && s149 < 1, `实际 ${s149}`);
  // 正好 1.5 页：target 切到 2 但 (2/1.5)^0.4 恰好越过上限 → 自然分页
  assert.equal(computeFitScale(1.5 * H, H), 1);
  // 1.74 页 → 目标 2 页，适度放大补齐
  const s174 = computeFitScale(1.74 * H, H);
  assert.ok(s174 > 1.04 && s174 <= FIT_MAX_SCALE, `实际 ${s174}`);
});

test('computeFitScale: 两页出头收进两页', () => {
  const s = computeFitScale(2.05 * H, H);
  assert.ok(s > 0.98 && s < 0.995, `实际 ${s}`);
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

test('computeFitScale: 1 页附近的微小溢出也被收进整页（防孤行页）', () => {
  // 1.005 页 / 2.05 页的孤行页是真实痛点，需要 0.998 / 0.99 的微小 zoom 修正
  assert.ok(Math.abs(computeFitScale(1.005 * H, H) - 0.998) < 0.001, `实际 ${computeFitScale(1.005 * H, H)}`);
  assert.ok(Math.abs(computeFitScale(2.05 * H, H) - 0.99) < 0.001, `实际 ${computeFitScale(2.05 * H, H)}`);
});
