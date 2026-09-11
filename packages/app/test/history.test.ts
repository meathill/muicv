import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAgentInput, estimateTokens, getModelBudget } from '../src/main/agent/history.ts';
import type { ChatMessage } from '../src/shared/types.ts';

let counter = 0;
function msg(role: ChatMessage['role'], content: string): ChatMessage {
  counter += 1;
  return { id: `m-${counter}`, role, content, createdAt: counter };
}

test('estimateTokens 大致随长度上升', () => {
  // 短文本因为 ceil 舍入会持平，这里用足够长的字符串看趋势
  assert.ok(estimateTokens('a'.repeat(10)) < estimateTokens('a'.repeat(100)));
  assert.ok(estimateTokens('a'.repeat(100)) < estimateTokens('a'.repeat(1000)));
  assert.equal(estimateTokens(''), 0);
});

test('getModelBudget mimo 系列走 1M context（800k 预算）', () => {
  assert.equal(getModelBudget('mimo-v2.5'), 800_000);
});

test('getModelBudget DeepSeek、GPT-5.6 与未知模型走 256K context（204800 预算）', () => {
  assert.equal(getModelBudget('deepseek-v4.1-flash'), 204_800);
  assert.equal(getModelBudget('gpt-5.6-luna'), 204_800);
  assert.equal(getModelBudget('gpt-5.6-terra'), 204_800);
  assert.equal(getModelBudget('gpt-5.6-sol'), 204_800);
  assert.equal(getModelBudget('foo'), 204_800);
});

test('buildAgentInput 空数组 → 空 items', async () => {
  const r = await buildAgentInput([]);
  assert.equal(r.items.length, 0);
  assert.equal(r.droppedCount, 0);
  assert.equal(r.estimatedTokens, 0);
});

test('buildAgentInput 单条 user → 单条 UserMessageItem', async () => {
  const r = await buildAgentInput([msg('user', '你好')]);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].role, 'user');
  assert.equal((r.items[0] as { content: string }).content, '你好');
  assert.equal(r.droppedCount, 0);
});

test('buildAgentInput 多条混合保持时间顺序 + 角色映射', async () => {
  const r = await buildAgentInput([msg('user', 'A'), msg('assistant', 'B'), msg('user', 'C')]);
  assert.equal(r.items.length, 3);
  assert.equal(r.items[0].role, 'user');
  assert.equal(r.items[1].role, 'assistant');
  assert.equal(r.items[2].role, 'user');

  // assistant 必须 array content + status 字段
  const a = r.items[1] as {
    status: string;
    content: Array<{ type: string; text: string }>;
  };
  assert.equal(a.status, 'completed');
  assert.equal(a.content[0].type, 'output_text');
  assert.equal(a.content[0].text, 'B');
});

test('buildAgentInput budget 极小时只剩最后一条 + ellipsis 提示', async () => {
  const long = 'X'.repeat(1000);
  const r = await buildAgentInput([msg('user', long), msg('assistant', long), msg('user', '最新的一句')], {
    budgetTokens: 10,
  });

  assert.equal(r.droppedCount, 2);
  // 第 1 条是 ellipsis，第 2 条是最新 user
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].role, 'user');
  assert.match((r.items[0] as { content: string }).content, /已省略 2 条/);
  assert.equal(r.items[1].role, 'user');
  assert.equal((r.items[1] as { content: string }).content, '最新的一句');
});

test('buildAgentInput budget 充足时全保留', async () => {
  const r = await buildAgentInput([msg('user', 'A'), msg('assistant', 'B'), msg('user', 'C')], {
    budgetTokens: 10_000,
  });
  assert.equal(r.items.length, 3);
  assert.equal(r.droppedCount, 0);
});

test('buildAgentInput 最后一条 user 自身超 budget 仍保留', async () => {
  const huge = '巨长内容'.repeat(2000);
  const r = await buildAgentInput([msg('user', '前面那条'), msg('user', huge)], { budgetTokens: 10 });

  // 最后一条强制保留；前面那条被丢；插一条 ellipsis
  assert.equal(r.droppedCount, 1);
  assert.equal(r.items.length, 2);
  assert.match((r.items[0] as { content: string }).content, /已省略 1 条/);
  assert.equal((r.items[1] as { content: string }).content, huge);
});

test('buildAgentInput 中间裁剪：保留最近的、丢最早的', async () => {
  // 每条估算 ~40 token；budget=120 应该恰好留最近 3 条（含最后 user）
  const each = '内容'.repeat(50); // 100 chars → ~40 tokens
  const r = await buildAgentInput(
    [msg('user', each), msg('assistant', each), msg('user', each), msg('assistant', each), msg('user', '最新')],
    { budgetTokens: 120 },
  );

  assert.ok(r.droppedCount >= 1, '至少丢一条最早的');
  // 第一条应该是 ellipsis
  assert.match((r.items[0] as { content: string }).content, /已省略/);
  // 最后一条永远是「最新」
  const last = r.items[r.items.length - 1] as { content: string };
  assert.equal(last.content, '最新');
});
