import assert from 'node:assert/strict';
import test from 'node:test';

import { modelSupportsVision, resolveModelAlias } from '@muicv/shared';
import { selectOpenAIAPI } from '../src/main/agent/llm-config.ts';
import type { AppConfig, ChatMessage } from '../src/shared/types.ts';

const baseConfig: AppConfig = {
  defaultModel: 'deepseek-v4-flash',
  workspaceDir: '/test/dir',
  onboardingCompleted: true,
  llmReasoningEffort: 'xhigh',
  muicvApiBase: 'https://api.muicv.com',
  muicvApiKey: 'test-key',
  customLlmBase: null,
  customLlmKey: null,
};

test('modelSupportsVision: deepseek-v4-flash-vision-exp 支持 vision，而 deepseek-v4-flash 不支持', () => {
  assert.equal(modelSupportsVision('deepseek-v4-flash'), false);
  assert.equal(modelSupportsVision('deepseek-v4-flash-vision-exp'), true);
  assert.equal(modelSupportsVision('gpt-5.6-luna'), true);
});

test('有图片时自动切换到 deepseek-v4-flash-vision-exp', () => {
  const messagesWithImage: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'look at this image',
      createdAt: Date.now(),
      attachments: [{ kind: 'image', path: 'inbox/pic.png', name: 'pic.png', size: 100, mimeType: 'image/png' }],
    },
  ];

  const hasImage = messagesWithImage.some((m) => m.attachments?.some((a) => a.kind === 'image'));
  let effectiveModel = resolveModelAlias(baseConfig.defaultModel) ?? baseConfig.defaultModel;
  if (hasImage && !modelSupportsVision(effectiveModel)) {
    effectiveModel = 'deepseek-v4-flash-vision-exp';
  }

  assert.equal(effectiveModel, 'deepseek-v4-flash-vision-exp');
  assert.equal(modelSupportsVision(effectiveModel), true);
});

test('有图片但当前模型已支持 vision 时保持原模型（如 gpt-5.6-luna）', () => {
  const gptConfig: AppConfig = { ...baseConfig, defaultModel: 'gpt-5.6-luna' };
  const messagesWithImage: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'look at this image',
      createdAt: Date.now(),
      attachments: [{ kind: 'image', path: 'inbox/pic.png', name: 'pic.png', size: 100, mimeType: 'image/png' }],
    },
  ];

  const hasImage = messagesWithImage.some((m) => m.attachments?.some((a) => a.kind === 'image'));
  let effectiveModel = resolveModelAlias(gptConfig.defaultModel) ?? gptConfig.defaultModel;
  if (hasImage && !modelSupportsVision(effectiveModel)) {
    effectiveModel = 'deepseek-v4-flash-vision-exp';
  }

  assert.equal(effectiveModel, 'gpt-5.6-luna');
});

test('无图片时保持 deepseek-v4-flash 默认模型', () => {
  const messagesWithoutImage: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'hello world',
      createdAt: Date.now(),
    },
  ];

  const hasImage = messagesWithoutImage.some((m) => m.attachments?.some((a) => a.kind === 'image'));
  let effectiveModel = resolveModelAlias(baseConfig.defaultModel) ?? baseConfig.defaultModel;
  if (hasImage && !modelSupportsVision(effectiveModel)) {
    effectiveModel = 'deepseek-v4-flash-vision-exp';
  }

  assert.equal(effectiveModel, 'deepseek-v4-flash');
});

test('selectOpenAIAPI: deepseek-v4-flash-vision-exp 走 chat_completions', () => {
  assert.equal(selectOpenAIAPI(baseConfig, 'deepseek-v4-flash-vision-exp'), 'chat_completions');
  assert.equal(selectOpenAIAPI(baseConfig, 'deepseek-v4-flash'), 'chat_completions');
  assert.equal(selectOpenAIAPI(baseConfig, 'gpt-5.6-luna'), 'responses');
});
