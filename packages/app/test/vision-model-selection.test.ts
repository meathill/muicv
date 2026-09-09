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

test('当前轮有图片时自动切换到 deepseek-v4-flash-vision-exp', () => {
  const messagesWithImage: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'look at this image',
      createdAt: Date.now(),
      attachments: [{ kind: 'image', path: 'inbox/pic.png', name: 'pic.png', size: 100, mimeType: 'image/png' }],
    },
  ];

  const lastUserMsg = messagesWithImage[messagesWithImage.length - 1];
  const hasImage = lastUserMsg?.role === 'user' && Boolean(lastUserMsg.attachments?.some((a) => a.kind === 'image'));
  let effectiveModel = resolveModelAlias(baseConfig.defaultModel) ?? baseConfig.defaultModel;
  if (hasImage && !modelSupportsVision(effectiveModel)) {
    effectiveModel = 'deepseek-v4-flash-vision-exp';
  }

  assert.equal(effectiveModel, 'deepseek-v4-flash-vision-exp');
  assert.equal(modelSupportsVision(effectiveModel), true);
});

test('历史有图片但当前轮是纯文本时，保持默认 deepseek-v4-flash 模型（省 token 并保持思考能力）', () => {
  const historyWithImages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: '看第一张图',
      createdAt: Date.now() - 2000,
      attachments: [{ kind: 'image', path: 'inbox/pic.png', name: 'pic.png', size: 100, mimeType: 'image/png' }],
    },
    {
      id: '2',
      role: 'assistant',
      content: '我已经看过了，发现如下问题...',
      createdAt: Date.now() - 1000,
    },
    {
      id: '3',
      role: 'user',
      content: '请把第二项修改成三年经验',
      createdAt: Date.now(),
    },
  ];

  const lastUserMsg = historyWithImages[historyWithImages.length - 1];
  const hasImage = lastUserMsg?.role === 'user' && Boolean(lastUserMsg.attachments?.some((a) => a.kind === 'image'));
  let effectiveModel = resolveModelAlias(baseConfig.defaultModel) ?? baseConfig.defaultModel;
  if (hasImage && !modelSupportsVision(effectiveModel)) {
    effectiveModel = 'deepseek-v4-flash-vision-exp';
  }

  // 保持默认 deepseek-v4-flash，不切换为 vision 模型
  assert.equal(effectiveModel, 'deepseek-v4-flash');
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

  const lastUserMsg = messagesWithImage[messagesWithImage.length - 1];
  const hasImage = lastUserMsg?.role === 'user' && Boolean(lastUserMsg.attachments?.some((a) => a.kind === 'image'));
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

  const lastUserMsg = messagesWithoutImage[messagesWithoutImage.length - 1];
  const hasImage = lastUserMsg?.role === 'user' && Boolean(lastUserMsg.attachments?.some((a) => a.kind === 'image'));
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
