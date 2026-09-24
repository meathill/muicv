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
  defaultModel: 'deepseek-v4.1-flash',
  llmReasoningEffort: 'xhigh',
  customLlmBase: null,
  customLlmKey: null,
  onboardingCompleted: true,
};

test('resolveModelAlias: deepseek-v4-flash 兼容映射为 deepseek-v4.1-flash；mimo-v2.5 系映射为 mimo-v2.6-flash', () => {
  assert.equal(resolveModelAlias('deepseek-v4-flash'), 'deepseek-v4.1-flash');
  assert.equal(resolveModelAlias('deepseek-v4-flash-vision-exp'), 'deepseek-v4.1-flash');
  assert.equal(resolveModelAlias('mimo-v2.5-pro'), 'mimo-v2.6-flash');
  assert.equal(resolveModelAlias('mimo-v2.5'), 'mimo-v2.6-flash');
});

test('resolveModelAlias: gpt-5.4 / gpt-5.5 / gpt-5.6 系兼容映射为 gpt-6-sol/luna', () => {
  assert.equal(resolveModelAlias('gpt-5.4'), 'gpt-6-sol');
  assert.equal(resolveModelAlias('gpt-5.5'), 'gpt-6-sol');
  assert.equal(resolveModelAlias('gpt-5.6-sol'), 'gpt-6-sol');
  assert.equal(resolveModelAlias('gpt-5.6-terra'), 'gpt-6-sol');
  assert.equal(resolveModelAlias('gpt-5.6-luna'), 'gpt-6-luna');
});

test('selectOpenAIAPI: mimo-v2.5-pro 经 alias 转为 mimo-v2.6-flash (thinking-mode) 后走 chat_completions', () => {
  const config = { ...baseConfig, defaultModel: 'mimo-v2.5-pro' };
  assert.equal(selectOpenAIAPI(config), 'chat_completions');
});

test('selectOpenAIAPI: gpt-5.4 经 alias 转为 gpt-6-sol 后走 responses 端点', () => {
  const config = { ...baseConfig, defaultModel: 'gpt-5.4' };
  assert.equal(selectOpenAIAPI(config), 'responses');
});

test('selectOpenAIAPI: 自带 customLlmBase + customLlmKey 统一走 chat_completions', () => {
  const config: AppConfig = {
    ...baseConfig,
    defaultModel: 'gpt-6-sol',
    customLlmBase: 'https://api.groq.com/openai/v1',
    customLlmKey: 'sk-custom',
  };
  assert.equal(selectOpenAIAPI(config), 'chat_completions');
});
