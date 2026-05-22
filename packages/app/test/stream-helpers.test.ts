import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENT_MAX_TURNS, isMaxTurnsError } from '../src/main/agent/stream-helpers.ts';

test('agent max turns 默认上限高于 SDK 原先的 30 轮', () => {
  assert.equal(AGENT_MAX_TURNS, 80);
});

test('识别 OpenAI Agents SDK 的 max turns 错误', () => {
  assert.equal(isMaxTurnsError('Max turns (30) exceeded'), true);
  assert.equal(isMaxTurnsError('max turns (80) exceeded'), true);
  assert.equal(isMaxTurnsError('Connection error.'), false);
});
