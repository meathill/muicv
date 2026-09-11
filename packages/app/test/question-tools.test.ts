import assert from 'node:assert/strict';
import test from 'node:test';

import { answerQuestion, buildQuestionTools, cancelPendingQuestions } from '../src/main/agent/question-tools.ts';

test('buildQuestionTools 返回 ask_question 工具', () => {
  const tools = buildQuestionTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, 'ask_question');
});

test('ask_question 挂起并通过 answerQuestion 单选唤醒', async () => {
  let waitingState = false;
  const [askTool] = buildQuestionTools((waiting) => {
    waitingState = waiting;
  });

  const toolPromise = (askTool as any).invoke(
    null,
    JSON.stringify({ question: '你倾向于哪种岗位？', options: ['前端', '后端', '全栈'] }),
    { toolCall: { callId: 'call_test_1' } },
  );

  assert.equal(waitingState, true);

  const answered = answerQuestion('call_test_1', {
    answer: '前端',
    customText: '希望主要使用 React',
  });
  assert.equal(answered, true);

  const result = await toolPromise;
  assert.equal(waitingState, false);
  assert.equal(result, '用户选择了：前端。用户补充说明：希望主要使用 React');
});

test('ask_question 多选与自定义回答组合', async () => {
  const [askTool] = buildQuestionTools();
  const toolPromise = (askTool as any).invoke(
    null,
    JSON.stringify({ question: '擅长的技术栈', options: ['TypeScript', 'Node.js', 'Rust'], multiSelect: true }),
    { toolCall: { callId: 'call_test_2' } },
  );

  const answered = answerQuestion('call_test_2', {
    answer: ['TypeScript', 'Node.js'],
  });
  assert.equal(answered, true);

  const result = await toolPromise;
  assert.equal(result, '用户选择了：TypeScript、Node.js');
});

test('ask_question 仅有自定义文字无选项', async () => {
  const [askTool] = buildQuestionTools();
  const toolPromise = (askTool as any).invoke(null, JSON.stringify({ question: '你的期望薪资范围？' }), {
    toolCall: { callId: 'call_test_3' },
  });

  const answered = answerQuestion('call_test_3', {
    answer: '',
    customText: '25k-30k',
  });
  assert.equal(answered, true);

  const result = await toolPromise;
  assert.equal(result, '用户回答：25k-30k');
});

test('cancelPendingQuestions 取消等待中的提问', async () => {
  let waitingState = false;
  const [askTool] = buildQuestionTools((w) => {
    waitingState = w;
  });

  const toolPromise = (askTool as any).invoke(null, JSON.stringify({ question: '等待中断' }), {
    toolCall: { callId: 'call_test_cancel' },
  });

  assert.equal(waitingState, true);
  cancelPendingQuestions('user aborted');
  assert.equal(waitingState, false);

  const res = await toolPromise;
  assert.match(res, /提问已取消/);
});

test('answerQuestion 没有对应 pending 时返回 false（历史提问 / run 已结束）', () => {
  cancelPendingQuestions('test cleanup');
  assert.equal(answerQuestion('call_not_pending', { answer: '前端' }), false);
});

test('answerQuestion 在没有 pending 时调用 cancelPendingQuestions 是安全的', () => {
  cancelPendingQuestions('empty');
  cancelPendingQuestions('empty again');
});

test('多个 pending 时按 callId 精确唤醒，不答错对象', async () => {
  const [askTool] = buildQuestionTools();
  const firstPromise = (askTool as any).invoke(null, JSON.stringify({ question: '第一个问题', options: ['A', 'B'] }), {
    toolCall: { callId: 'call_multi_1' },
  });
  const secondPromise = (askTool as any).invoke(null, JSON.stringify({ question: '第二个问题', options: ['C', 'D'] }), {
    toolCall: { callId: 'call_multi_2' },
  });

  // 故意先回答第二个，验证不会因为顺序而串台
  assert.equal(answerQuestion('call_multi_2', { answer: 'D' }), true);
  assert.equal(await secondPromise, '用户选择了：D');

  assert.equal(answerQuestion('call_multi_1', { answer: 'A' }), true);
  assert.equal(await firstPromise, '用户选择了：A');
});

test('callId 对不上时走兜底唤醒最早的 pending，且返回 true', async () => {
  const [askTool] = buildQuestionTools();
  const toolPromise = (askTool as any).invoke(null, JSON.stringify({ question: '兜底问题', options: ['X'] }), {
    toolCall: { callId: 'call_real_id' },
  });

  const accepted = answerQuestion('call_id_mismatch', { answer: 'X' });
  assert.equal(accepted, true);
  assert.equal(await toolPromise, '用户选择了：X');
});
