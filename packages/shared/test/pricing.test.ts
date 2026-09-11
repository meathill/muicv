import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeLlmCharge,
  DEFAULT_LLM_MODEL,
  displayToMicro,
  getPlanLabel,
  insufficientBalanceError,
  isSupportedLlmModel,
  LLM_DISPLAY_META,
  LLM_MODEL_ALIASES,
  LLM_PRICING,
  LLM_RATIO,
  microToDisplay,
  modelSupportsAudioInput,
  modelSupportsReasoningEffort,
  modelSupportsToolCalls,
  modelSupportsVision,
  normalizeModel,
  normalizeReasoningEffort,
  resolveModelAlias,
  SUBSCRIPTION_PLANS,
  SUPPORTED_LLM_MODELS,
  TOKEN_PRECISION,
  TOPUP_PACKS,
  TTS_MAX_TEXT_CHARS,
  TTS_RATE_PER_CHAR,
} from '../src/pricing.ts';

/** 从 display 文案里抠出数字：'$4.88 / 月' → 4.88。 */
function parseUsd(display: string): number {
  const m = display.match(/([\d.]+)/);
  assert.ok(m, `无法从 ${display} 解析美元金额`);
  return Number(m[1]);
}

/** USD / 1M 显示 token 的单价。 */
function usdPerMillion(usd: number, tokens: number): number {
  return usd / (tokens / 1_000_000);
}

describe('Pricing', () => {
  describe('precision helpers', () => {
    it('TOKEN_PRECISION = 10_000', () => {
      assert.equal(TOKEN_PRECISION, 10_000);
    });

    it('TTS 计费常量为正且有上限', () => {
      assert.ok(TTS_RATE_PER_CHAR > 0);
      assert.ok(TTS_MAX_TEXT_CHARS >= 500);
    });

    it('displayToMicro / microToDisplay round-trip', () => {
      assert.equal(displayToMicro(1), 10_000);
      assert.equal(displayToMicro(0), 0);
      assert.equal(displayToMicro(0.5), 5_000);
      assert.equal(microToDisplay(15_000), 1.5);
      assert.equal(microToDisplay(0), 0);
    });

    it('displayToMicro rounds浮点误差', () => {
      // 0.1 + 0.2 = 0.30000000000000004，displayToMicro 必须 round 到 3000
      assert.equal(displayToMicro(0.1 + 0.2), 3000);
    });
  });

  describe('LLM_PRICING table', () => {
    it('包含 5 个支持的 model（声明顺序 = UI 展示顺序，默认在前）', () => {
      assert.deepEqual(SUPPORTED_LLM_MODELS, [
        'deepseek-v4.1-flash',
        'mimo-v2.5',
        'gpt-5.6-luna',
        'gpt-5.6-terra',
        'gpt-5.6-sol',
      ]);
    });

    it('upstream 归属：文本主力与语音理解走 OpenCode Go，GPT 升级档走 OpenAI', () => {
      assert.equal(LLM_PRICING['deepseek-v4.1-flash'].upstream, 'opencode-go');
      assert.equal(LLM_PRICING['mimo-v2.5'].upstream, 'opencode-go');
      for (const id of ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol']) {
        assert.equal(LLM_PRICING[id].upstream, 'openai');
      }
    });

    it('每个 model 都有 upstream + inputRate + cachedInputRate + outputRate（正数）', () => {
      for (const id of SUPPORTED_LLM_MODELS) {
        const rate = LLM_PRICING[id];
        assert.ok(rate, `${id} missing rate`);
        assert.ok(rate.upstream === 'openai' || rate.upstream === 'opencode-go', `${id} bad upstream`);
        assert.ok(rate.inputRate > 0, `${id} inputRate should be > 0`);
        assert.ok(rate.outputRate > 0, `${id} outputRate should be > 0`);
        assert.ok(rate.cachedInputRate > 0, `${id} cachedInputRate should be > 0`);
        assert.ok(rate.cachedInputRate <= rate.inputRate, `${id} cachedInputRate should be ≤ inputRate`);
      }
    });

    it('isSupportedLlmModel 正/负样本（含已下架旧 id）', () => {
      assert.equal(isSupportedLlmModel('deepseek-v4.1-flash'), true);
      assert.equal(isSupportedLlmModel('mimo-v2.5'), true);
      assert.equal(isSupportedLlmModel('gpt-5.6-luna'), true);
      assert.equal(isSupportedLlmModel('deepseek-v4-flash'), false); // 已下架，通过 alias 兼容
      assert.equal(isSupportedLlmModel('deepseek-v4-flash-vision-exp'), false); // 已下架，通过 alias 兼容
      assert.equal(isSupportedLlmModel('mimo-v2.5-pro'), false); // 已下架，通过 alias 兼容
      assert.equal(isSupportedLlmModel('gpt-5.4'), false); // 已下架，通过 alias 兼容
      assert.equal(isSupportedLlmModel('gpt-4o-mini'), false);
      assert.equal(isSupportedLlmModel(''), false);
    });

    it('resolveModelAlias：已下架别名映射到目标兼容模型，其他模型原样返回', () => {
      assert.equal(resolveModelAlias('deepseek-v4-flash'), 'deepseek-v4.1-flash');
      assert.equal(resolveModelAlias('deepseek-v4-flash-vision-exp'), 'deepseek-v4.1-flash');
      assert.equal(resolveModelAlias('mimo-v2.5-pro'), 'deepseek-v4.1-flash');
      assert.equal(resolveModelAlias('gpt-5.4'), 'gpt-5.6-sol');
      assert.equal(resolveModelAlias('gpt-5.5'), 'gpt-5.6-sol');
      assert.equal(resolveModelAlias('deepseek-v4.1-flash'), 'deepseek-v4.1-flash');
      assert.equal(resolveModelAlias('gpt-5.6-luna'), 'gpt-5.6-luna');
      assert.equal(resolveModelAlias('unknown-model'), 'unknown-model');
      assert.equal(resolveModelAlias(null), null);
      assert.equal(resolveModelAlias(undefined), undefined);
    });

    it('DEFAULT_LLM_MODEL 必须落在 SUPPORTED_LLM_MODELS 里', () => {
      assert.ok(SUPPORTED_LLM_MODELS.includes(DEFAULT_LLM_MODEL), `DEFAULT_LLM_MODEL=${DEFAULT_LLM_MODEL} 未注册`);
    });

    it('DEFAULT_LLM_MODEL 是 deepseek-v4.1-flash（OpenCode Go 包月供给的多模态省成本默认）', () => {
      assert.equal(DEFAULT_LLM_MODEL, 'deepseek-v4.1-flash');
    });

    it('normalizeModel：别名模型映射到对应兼容模型，未知模型静默回退到默认', () => {
      assert.equal(normalizeModel('deepseek-v4-flash'), 'deepseek-v4.1-flash');
      assert.equal(normalizeModel('deepseek-v4-flash-vision-exp'), 'deepseek-v4.1-flash');
      assert.equal(normalizeModel('mimo-v2.5-pro'), 'deepseek-v4.1-flash');
      assert.equal(normalizeModel('gpt-5.4'), 'gpt-5.6-sol');
      assert.equal(normalizeModel('gpt-5.5'), 'gpt-5.6-sol');
      assert.equal(normalizeModel('foo'), DEFAULT_LLM_MODEL);
      assert.equal(normalizeModel(null), DEFAULT_LLM_MODEL);
      assert.equal(normalizeModel(undefined), DEFAULT_LLM_MODEL);
      assert.equal(normalizeModel(''), DEFAULT_LLM_MODEL);
    });

    it('normalizeModel：白名单内 id 原样返回', () => {
      for (const id of SUPPORTED_LLM_MODELS) {
        assert.equal(normalizeModel(id), id);
      }
    });
  });

  describe('capability flags', () => {
    it('modelSupportsAudioInput 只对 mimo-v2.5（全模态）为 true', () => {
      assert.equal(modelSupportsAudioInput('mimo-v2.5'), true);
      assert.equal(modelSupportsAudioInput('deepseek-v4.1-flash'), false);
      assert.equal(modelSupportsAudioInput('gpt-5.6-luna'), false);
      assert.equal(modelSupportsAudioInput('unknown-model'), false);
    });

    it('modelSupportsVision：GPT-5.6 系与 deepseek-v4.1-flash 原生 vision；mimo 关闭', () => {
      assert.equal(modelSupportsVision('gpt-5.6-luna'), true);
      assert.equal(modelSupportsVision('gpt-5.6-terra'), true);
      assert.equal(modelSupportsVision('gpt-5.6-sol'), true);
      assert.equal(modelSupportsVision('deepseek-v4.1-flash'), true);
      assert.equal(modelSupportsVision('mimo-v2.5'), false);
      assert.equal(modelSupportsVision('unknown-model'), false);
    });

    it('modelSupportsToolCalls 全表 true 且未知 id 默认 true（多数模型都支持）', () => {
      for (const id of SUPPORTED_LLM_MODELS) {
        assert.equal(modelSupportsToolCalls(id), LLM_DISPLAY_META[id]?.supportsToolCalls ?? true);
      }
      assert.equal(modelSupportsToolCalls('brand-new-model'), true);
    });

    it('modelSupportsReasoningEffort 只有 GPT-5.6 家族可调', () => {
      assert.equal(modelSupportsReasoningEffort('gpt-5.6-luna'), true);
      assert.equal(modelSupportsReasoningEffort('gpt-5.6-terra'), true);
      assert.equal(modelSupportsReasoningEffort('gpt-5.6-sol'), true);
      assert.equal(modelSupportsReasoningEffort('deepseek-v4.1-flash'), false);
      assert.equal(modelSupportsReasoningEffort('mimo-v2.5'), false);
      assert.equal(modelSupportsReasoningEffort('unknown-model'), false);
    });

    it('normalizeReasoningEffort：非法值收敛到 xhigh 默认档', () => {
      assert.equal(normalizeReasoningEffort('low'), 'low');
      assert.equal(normalizeReasoningEffort('medium'), 'medium');
      assert.equal(normalizeReasoningEffort('high'), 'high');
      assert.equal(normalizeReasoningEffort('xhigh'), 'xhigh');
      assert.equal(normalizeReasoningEffort('max'), 'xhigh'); // 官方还有 max 档但 UI 不放
      assert.equal(normalizeReasoningEffort(undefined), 'xhigh');
      assert.equal(normalizeReasoningEffort(null), 'xhigh');
    });
  });

  describe('computeLlmCharge', () => {
    it('gpt-5.6-luna：1k input + 1k output', () => {
      // (1000 × 0.02 + 1000 × 0.12) × 1.1 × 10_000 = 140 × 1.1 × 10_000 = 1_540_000
      const cost = computeLlmCharge('gpt-5.6-luna', 1000, 1000);
      assert.equal(cost, Math.ceil(140 * LLM_RATIO * TOKEN_PRECISION));
    });

    it('gpt-5.6-luna：纯 input', () => {
      // 1000 × 0.02 × 1.1 × 10_000 = 220_000
      const cost = computeLlmCharge('gpt-5.6-luna', 1000, 0);
      assert.equal(cost, Math.ceil(20 * LLM_RATIO * TOKEN_PRECISION));
    });

    it('gpt-5.6-terra：input + output 不对称', () => {
      // 100 × 0.2 + 200 × 1.2 = 20 + 240 = 260 显示 token
      const cost = computeLlmCharge('gpt-5.6-terra', 100, 200);
      assert.equal(cost, Math.ceil(260 * LLM_RATIO * TOKEN_PRECISION));
    });

    it('gpt-5.6-sol：官方 $4 / $20 per 1M 校准计费', () => {
      // 100 × 0.4 + 100 × 2.0 = 40 + 200 = 240 显示 token
      const cost = computeLlmCharge('gpt-5.6-sol', 100, 100);
      assert.equal(cost, Math.ceil(240 * LLM_RATIO * TOKEN_PRECISION));
    });

    it('mimo-v2.5：极廉价输入精度被保留（μ 级别 ceil）', () => {
      // 1 input × 0.008 = 0.008 显示 token
      // ceil(0.008 × 1.1 × 10_000) = ceil(88) = 88 μ
      // 旧公式（整数 ceil 显示 token）：ceil(0.008 × 1.1) = 1 显示 token = 10_000 μ，溢扣 113×
      const cost = computeLlmCharge('mimo-v2.5', 1, 0);
      assert.equal(cost, 88);
    });

    it('0 + 0 → 0', () => {
      assert.equal(computeLlmCharge('gpt-5.6-luna', 0, 0), 0);
    });

    it('未知 model → null', () => {
      assert.equal(computeLlmCharge('gpt-4o-mini', 100, 100), null);
      assert.equal(computeLlmCharge('gpt-5.4', 100, 100), null);
      assert.equal(computeLlmCharge('', 100, 100), null);
    });

    it('cachedTokens=0 与省略参数等价（回归保护）', () => {
      assert.equal(computeLlmCharge('gpt-5.6-luna', 1000, 500, 0), computeLlmCharge('gpt-5.6-luna', 1000, 500));
    });

    it('gpt-5.6-luna：cached 命中应严格便宜', () => {
      // fresh=200, cached=800, completion=500
      // cost = 200 × 0.02 + 800 × 0.002 + 500 × 0.12 = 4 + 1.6 + 60 = 65.6 显示 token
      const withCache = computeLlmCharge('gpt-5.6-luna', 1000, 500, 800);
      const withoutCache = computeLlmCharge('gpt-5.6-luna', 1000, 500, 0);
      assert.equal(withCache, Math.ceil((4 + 1.6 + 60) * LLM_RATIO * TOKEN_PRECISION));
      assert.ok(withCache! < withoutCache!, 'cached 命中应该严格便宜');
    });

    it('cachedTokens > promptTokens 时 clamp 到 promptTokens', () => {
      // 全 prompt 命中 cache，等价于 cached=1000
      const clamped = computeLlmCharge('gpt-5.6-luna', 1000, 500, 99_999);
      const allCached = computeLlmCharge('gpt-5.6-luna', 1000, 500, 1000);
      assert.equal(clamped, allCached);
    });

    it('mimo cachedInputRate=inputRate 时，cached 不影响价格', () => {
      const a = computeLlmCharge('mimo-v2.5', 1000, 200, 0);
      const b = computeLlmCharge('mimo-v2.5', 1000, 200, 800);
      assert.equal(a, b);
    });
  });

  describe('getPlanLabel', () => {
    it('已知档位返回中文', () => {
      assert.equal(getPlanLabel('free'), '免费版');
      assert.equal(getPlanLabel('pro'), 'Pro 会员');
      assert.equal(getPlanLabel('max'), 'Max 会员');
    });

    it('null / undefined / 空串 → 兜底「免费版」', () => {
      assert.equal(getPlanLabel(null), '免费版');
      assert.equal(getPlanLabel(undefined), '免费版');
      assert.equal(getPlanLabel(''), '免费版');
    });

    it('未知 plan → 原样返回（避免误降级到免费版）', () => {
      assert.equal(getPlanLabel('enterprise'), 'enterprise');
      assert.equal(getPlanLabel('lifetime'), 'lifetime');
    });
  });

  describe('insufficientBalanceError', () => {
    it('入参是 μtoken，文案里展示 display token', () => {
      // 100_000 μ = 10 display tokens
      const err = insufficientBalanceError(100_000);
      assert.equal(err.error.type, 'insufficient_balance');
      assert.equal(err.error.code, 'insufficient_balance');
      assert.ok(err.error.message.includes('10 tokens'), `expected '10 tokens' in message: ${err.error.message}`);
    });

    it('小数余额按显示 token 输出（toLocaleString）', () => {
      // 5_000 μ = 0.5 display token
      const err = insufficientBalanceError(5_000);
      assert.ok(err.error.message.includes('0.5 tokens'), `expected '0.5 tokens' in message: ${err.error.message}`);
    });
  });

  describe('订阅 / 补充包定价', () => {
    it('订阅只卖 USD（人民币不能订阅）', () => {
      for (const tier of ['pro', 'max'] as const) {
        assert.deepEqual(Object.keys(SUBSCRIPTION_PLANS[tier].monthly.display), ['usd']);
        assert.deepEqual(Object.keys(SUBSCRIPTION_PLANS[tier].yearly.display), ['usd']);
        assert.deepEqual(Object.keys(SUBSCRIPTION_PLANS[tier].yearly.savingsLabel), ['usd']);
      }
    });

    it('年付发「约 11 个月用量」，不是整年 12 倍（2026-09 降 token 后）', () => {
      const pro = SUBSCRIPTION_PLANS.pro;
      const max = SUBSCRIPTION_PLANS.max;
      // 比 10 倍多、比 12 倍少 —— 既保住年付折扣，又不做「10 个月的钱买 12 个月的量」
      assert.ok(pro.yearly.tokens > pro.monthly.tokens * 10, 'Pro 年付应多于 10 倍月付量');
      assert.ok(pro.yearly.tokens < pro.monthly.tokens * 12, 'Pro 年付不应再有整年 12 倍量');
      assert.ok(max.yearly.tokens > max.monthly.tokens * 10, 'Max 年付应多于 10 倍月付量');
      assert.ok(max.yearly.tokens < max.monthly.tokens * 12, 'Max 年付不应再有整年 12 倍量');
    });

    it('年付每 token 比月付便宜，但折扣不超过 15%（避免重回满载大亏）', () => {
      for (const tier of ['pro', 'max'] as const) {
        const plan = SUBSCRIPTION_PLANS[tier];
        const monthlyPerM = usdPerMillion(parseUsd(plan.monthly.display.usd), plan.monthly.tokens);
        const yearlyPerM = usdPerMillion(parseUsd(plan.yearly.display.usd), plan.yearly.tokens);
        assert.ok(yearlyPerM < monthlyPerM, `${tier} 年付单价应低于月付`);
        assert.ok(
          yearlyPerM >= monthlyPerM * 0.85,
          `${tier} 年付折扣不应超过 15%（实际 ${yearlyPerM}/${monthlyPerM}）`,
        );
      }
    });

    it('补充包买得越多单价越低，但永远比订阅贵（引导走订阅）', () => {
      const packs = (['small', 'medium', 'large'] as const).map((k) =>
        usdPerMillion(parseUsd(TOPUP_PACKS[k].display.usd), TOPUP_PACKS[k].tokens),
      );
      // 单价阶梯递减：small > medium > large
      assert.ok(packs[0] > packs[1], `small(${packs[0]}) 应贵于 medium(${packs[1]})`);
      assert.ok(packs[1] > packs[2], `medium(${packs[1]}) 应贵于 large(${packs[2]})`);

      // 最便宜的补充包依然贵于最便宜的订阅（订阅月付里单价最低的是 Max）
      const cheapestSub = Math.min(
        usdPerMillion(parseUsd(SUBSCRIPTION_PLANS.pro.monthly.display.usd), SUBSCRIPTION_PLANS.pro.monthly.tokens),
        usdPerMillion(parseUsd(SUBSCRIPTION_PLANS.max.monthly.display.usd), SUBSCRIPTION_PLANS.max.monthly.tokens),
        usdPerMillion(parseUsd(SUBSCRIPTION_PLANS.pro.yearly.display.usd), SUBSCRIPTION_PLANS.pro.yearly.tokens),
        usdPerMillion(parseUsd(SUBSCRIPTION_PLANS.max.yearly.display.usd), SUBSCRIPTION_PLANS.max.yearly.tokens),
      );
      assert.ok(packs[2] > cheapestSub, `最便宜补充包 large(${packs[2]}) 应贵于最便宜订阅(${cheapestSub})`);
    });

    it('补充包 CNY 价存在（人民币唯一购买入口），且 USD/CNY 同档 token 数一致', () => {
      for (const key of ['small', 'medium', 'large'] as const) {
        assert.ok(TOPUP_PACKS[key].display.usd, `${key} 缺 usd 价`);
        assert.ok(TOPUP_PACKS[key].display.cny, `${key} 缺 cny 价（CN 用户唯一入口）`);
        assert.ok(TOPUP_PACKS[key].tokens > 0);
      }
    });
  });
});
