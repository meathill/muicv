import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveModelAlias } from '@muicv/shared';

import { selectOpenAIAPI } from '../src/main/agent/llm-config.ts';
import type { AppConfig } from '../src/shared/types.ts';

const baseConfig: AppConfig = {
  profiles: [],
  activeProfileId: null,
  workspaceDir: null,
  muicvApiKey: 'mui_test_key',
  muicvApiBase: 'https://api.muicv.com',
  defaultModel: 'deepseek-v4-flash',
  llmReasoningEffort: 'xhigh',
  customLlmBase: null,
  customLlmKey: null,
  onboardingCompleted: true,
};

test('resolveModelAlias: mimo-v2.5-pro 兼容映射为 deepseek-v4-flash', () => {
  assert.equal(resolveModelAlias('mimo-v2.5-pro'), 'deepseek-v4-flash');
});

test('resolveModelAlias: gpt-5.4 与 gpt-5.5 兼容映射为 gpt-5.6-sol', () => {
  assert.equal(resolveModelAlias('gpt-5.4'), 'gpt-5.6-sol');
  assert.equal(resolveModelAlias('gpt-5.5'), 'gpt-5.6-sol');
});

test('selectOpenAIAPI: mimo-v2.5-pro 经 alias 转为 deepseek-v4-flash (thinking-mode) 后走 chat_completions', () => {
  const config = { ...baseConfig, defaultModel: 'mimo-v2.5-pro' };
  assert.equal(selectOpenAIAPI(config), 'chat_completions');
});

test('selectOpenAIAPI: gpt-5.4 经 alias 转为 gpt-5.6-sol 后走 responses 端点', () => {
  const config = { ...baseConfig, defaultModel: 'gpt-5.4' };
  assert.equal(selectOpenAIAPI(config), 'responses');
});

test('selectOpenAIAPI: 自带 customLlmBase + customLlmKey 统一走 chat_completions', () => {
  const config: AppConfig = {
    ...baseConfig,
    defaultModel: 'gpt-5.6-sol',
    customLlmBase: 'https://api.groq.com/openai/v1',
    customLlmKey: 'sk-custom',
  };
  assert.equal(selectOpenAIAPI(config), 'chat_completions');
});
