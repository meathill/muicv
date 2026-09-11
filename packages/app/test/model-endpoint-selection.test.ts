import assert from 'node:assert/strict';
import test from 'node:test';

import { modelSupportsVision, resolveModelAlias } from '@muicv/shared';
import { selectOpenAIAPI } from '../src/main/agent/llm-config.ts';
import type { AppConfig } from '../src/shared/types.ts';

const baseConfig: AppConfig = {
  defaultModel: 'deepseek-v4.1-flash',
  workspaceDir: '/test/dir',
  onboardingCompleted: true,
  llmReasoningEffort: 'xhigh',
  muicvApiBase: 'https://api.muicv.com',
  muicvApiKey: 'test-key',
  customLlmBase: null,
  customLlmKey: null,
};

test('modelSupportsVision: deepseek-v4.1-flash 原生多模态支持 vision，mimo-v2.5 不支持', () => {
  assert.equal(modelSupportsVision('deepseek-v4.1-flash'), true);
  assert.equal(modelSupportsVision('mimo-v2.5'), false);
  assert.equal(modelSupportsVision('gpt-5.6-luna'), true);
});

test('默认模型不再按本轮是否带图切换：deepseek-v4.1-flash 原生吃图', () => {
  const effectiveModel = resolveModelAlias(baseConfig.defaultModel) ?? baseConfig.defaultModel;
  assert.equal(effectiveModel, 'deepseek-v4.1-flash');
  assert.equal(modelSupportsVision(effectiveModel), true);
});

test('旧 id 经 alias 收敛到 deepseek-v4.1-flash（含已移除的视觉实验变体）', () => {
  assert.equal(resolveModelAlias('deepseek-v4-flash'), 'deepseek-v4.1-flash');
  assert.equal(resolveModelAlias('deepseek-v4-flash-vision-exp'), 'deepseek-v4.1-flash');
});

test('selectOpenAIAPI: deepseek-v4.1-flash 走 chat_completions，gpt-5.6-luna 走 responses', () => {
  assert.equal(selectOpenAIAPI(baseConfig, 'deepseek-v4.1-flash'), 'chat_completions');
  assert.equal(selectOpenAIAPI(baseConfig, 'gpt-5.6-luna'), 'responses');
});
