/**
 * Token 经济常量。website / api / app 三端共用。
 *
 * 单位：
 *   - **显示 token**（display token）：用户面前看到的数字，套餐宣传、ledger 历史、API 响应都按这个口径。
 *     可以是小数（少见，因为 markup ceil 在 μtoken 层就够整齐了）。本文件的常量
 *     （SIGNUP_BONUS / PDF_RENDER_COST / JD_FETCH_COST / SUBSCRIPTION_PLANS / TOPUP_PACKS）都用显示 token。
 *   - **μtoken**（micro-token）：内部存储和计算单位，integer。1 显示 token = 10_000 μtoken。
 *     `tokenBalance.balance` / `tokenLedger.delta` / wallet API 入参出参都是 μtoken。
 *   - 边界：调 wallet 之前 `displayToMicro`；从 wallet 出 API / SSR 渲染时 `microToDisplay`。
 *
 * 计费：LLM 按 model 分价（见 LLM_PRICING），prompt / completion 分两列；功能门（PDF / JD）按固定显示 token 扣账。
 *
 * 锚点：1 显示 token ≈ $1e-5（从 Pro 套餐反推：500k / $4.99）。Xiaomi 价以 ¥7/USD 折算到 USD 后再算 rate。
 *
 * 注册赠送 SIGNUP_BONUS 走 lazy init（第一次读 tokenBalance 时 INSERT OR IGNORE），
 * 不依赖 Better Auth 的 user.create hook（OpenNext 上 hook 踩坑多）。
 */

/** 显示 token → μtoken 的进位倍率。1 显示 token = 10_000 μtoken。 */
export const TOKEN_PRECISION = 10_000;

/** 显示 token → μtoken（用 round 容忍浮点误差，比如 0.1 + 0.2）。 */
export function displayToMicro(displayTokens: number): number {
  return Math.round(displayTokens * TOKEN_PRECISION);
}

/** μtoken → 显示 token（小数原样保留，渲染层自己 toFixed 决定精度）。 */
export function microToDisplay(microTokens: number): number {
  return microTokens / TOKEN_PRECISION;
}

/** 注册赠送 token（显示 token），wrangler vars 里可覆写。折算 $0.10（≈ ¥0.70）。 */
export const SIGNUP_BONUS = 10_000;

/** PDF 单次渲染扣 token（显示 token）。折算 $0.002 ≈ ¥0.014。 */
export const PDF_RENDER_COST = 200;

/** JD 单次抓取扣 token（显示 token）。折算 $0.003 ≈ ¥0.021。 */
export const JD_FETCH_COST = 300;

/**
 * STT 转写按音频时长扣 token（显示 token / 分钟，向上取整到分钟）。
 * 折算 $0.001 / 分钟 ≈ ¥0.007 / 分钟。
 * 草案值：跑一段时间（issue #1 M1）观察 Workers AI Whisper 真实账单后再校准。
 */
export const STT_TRANSCRIBE_RATE_PER_MIN = 100;

/**
 * 反馈奖励：用户给单条 AI 消息点赞 / 踩。显示 token。
 * 同一条消息只奖励一次（赞踩切换不重复发奖）。
 */
export const FEEDBACK_RATING_REWARD = 1000;

/**
 * 反馈奖励：用户给单条 AI 消息留 ≥ FEEDBACK_COMMENT_MIN_CHARS 字的评论。显示 token。
 * 不限次数（同一条消息可以反复留评论，每次都奖励）。
 */
export const FEEDBACK_COMMENT_REWARD = 50_000;

/** 评论奖励的最低字数门槛（unicode code point 计数，<50 字仍可提交但不奖励）。 */
export const FEEDBACK_COMMENT_MIN_CHARS = 50;

/** 评论原文最大字数（防滥用，超过截断或拒收）。 */
export const FEEDBACK_COMMENT_MAX_CHARS = 2000;

/**
 * LLM 计费表。每个 model 一项：
 *   - inputRate：1 上游 prompt token 折合多少显示 token
 *   - cachedInputRate：1 上游 prompt cache 命中 token 折合多少显示 token（≤ inputRate）
 *   - outputRate：1 上游 completion token 折合多少显示 token
 *
 * 数值以「1 显示 token = $1e-5」为锚点反算（Xiaomi 价用 ¥7/USD 折算）。
 *
 * cached_tokens 由上游 `usage.prompt_tokens_details.cached_tokens` 提供，
 * 注意 OpenAI 约定下它**已计入** `prompt_tokens`，扣账时要减出新鲜部分单独算价。
 *
 * 数据来源（review 时核对）：
 *   - gpt-5.4：https://developers.openai.com/api/docs/pricing
 *     （prompt caching 命中部分按 input 价 10%（90% off）计费，2026-05-10 校准；
 *     之前误配 50%，导致 cache 重的请求净加价 ~13.6% 高于设计 10%）
 *   - mimo-v2.5-pro / mimo-v2.5：Xiaomi Mimo 平台官方报价
 *     （上游目前未在 usage 里返回 cached_tokens，cachedInputRate 暂保守等于 inputRate）
 *
 * 平台路径（余额 > 0）只接受表里的 model；表外 model 在 routes/llm.ts 拦截 400。
 * muirouter fallback 路径不受本表约束（model 列表由 muirouter 端管理）。
 */
// 声明顺序 = ModelCard / 设置页的可视顺序：默认 mimo Pro 在前，
// 推荐的"全模态 mimo（支持语音面试）"次之，最后才是 GPT 系列。
export const LLM_PRICING: Record<string, { inputRate: number; cachedInputRate: number; outputRate: number }> = {
  // 上游 input ¥1.4 (≈$0.20) / output ¥21 (≈$3) per 1M tokens
  // 用户支付（×1.1） input ¥1.54 (≈$0.22) / output ¥23.1 (≈$3.30) per 1M tokens
  'mimo-v2.5-pro': { inputRate: 0.02, cachedInputRate: 0.02, outputRate: 0.3 },
  // 上游 input ¥0.56 (≈$0.08) / output ¥14 (≈$2) per 1M tokens
  // 用户支付（×1.1） input ¥0.616 (≈$0.088) / output ¥15.4 (≈$2.20) per 1M tokens
  'mimo-v2.5': { inputRate: 0.008, cachedInputRate: 0.008, outputRate: 0.2 },
  // 上游 input $2.5 / cached $0.25 / output $15 per 1M tokens
  // 用户支付（×1.1） input $2.75 / cached $0.275 / output $16.5 per 1M tokens
  'gpt-5.4': { inputRate: 0.25, cachedInputRate: 0.025, outputRate: 1.5 },
};

/** markup：所有 model 统一 1.1×。等于「上游成本 + 10% 加价」。 */
export const LLM_RATIO = 1.1;

export function isSupportedLlmModel(model: string): boolean {
  return Object.hasOwn(LLM_PRICING, model);
}

/** 平台路径支持的 model id 列表，给 400 响应/前端选择 UI 用。 */
export const SUPPORTED_LLM_MODELS = Object.keys(LLM_PRICING);

/** 全平台默认模型 id。新装 / 老 store 里没设过时回退到这个；UI 也按 isDefault 标识。 */
export const DEFAULT_LLM_MODEL = 'mimo-v2.5-pro';

/**
 * 校验 / 回退用户保存的 model id。未知（含已下架的 gpt-5.5 等）静默回退到默认，不弹窗。
 * 桌面 app settings 读盘后、发起 LLM 请求前都该过一遍这个函数，避免老用户被旧 id 卡住。
 */
export function normalizeModel(model: string | null | undefined): string {
  if (!model || !Object.hasOwn(LLM_PRICING, model)) return DEFAULT_LLM_MODEL;
  return model;
}

/**
 * UI 展示元数据：人类可读名 / 上游 vendor / 输入输出价（保留原币种以便用户判断）/ 简短亮点。
 * 桌面 app 设置页的 ModelCard 用，避免在组件里硬编码字符串。
 */
export const LLM_DISPLAY_META: Record<
  string,
  {
    label: string;
    vendor: 'openai' | 'xiaomi';
    inputPrice: string;
    outputPrice: string;
    hint: string;
    /** true 表示这是全平台默认，UI 加 "默认" chip，并在 store 里没值时落到它。 */
    isDefault?: boolean;
    /**
     * 当前 muicv 平台路径下该 model id 是否能接受图像 input。
     * 模型本身能力 ≠ 平台路由能力——例如 mimo-v2.5 模型支持 vision，
     * 但 muirouter → OpenRouter 这条链上 endpoint 没勾 image capability，
     * 直接发图会被上游打回 404。详见 issue meathill/muicv#7。
     * 等 muirouter 那边修好了，把对应 model 的这个值改回 true 即可。
     */
    supportsVision: boolean;
    /**
     * 是否兼容 muicv 的 multi-turn 工具调用（agent 流程）。
     * 当前 false 的：mimo 系列——是 thinking-mode 推理模型，多轮调 tool 时
     * 要求把上一轮 assistant 的 reasoning_content 字段回传给 API，OpenAI Agents
     * SDK 不知道这个私有字段会丢掉，导致第二轮 400 "Param Incorrect"。
     * 这里 false 的模型在 ModelCard 显示警告 chip，引导用户切兼容模型；
     * 简单单轮 chat 不调 tool 时其实还能用，只是 agent 工作流不行。
     */
    supportsToolCalls: boolean;
    /**
     * 是否原生支持音频 input（Xiaomi MiMo OpenAI 兼容规范的 `input_audio` content part，
     * 文档：https://platform.xiaomimimo.com/static/docs/usage-guide/multimodal-understanding/audio-understanding.md）。
     * 为 true 时桌面 app 录音不再先做 Whisper STT，wav 以裸 base64 形式塞进
     * Agents SDK 的 `audio` content block，再由 SDK 转成上游 `input_audio`，
     * 让模型自己听音频——做模拟语音面试时省 STT 一次往返。
     * 目前只有 mimo-v2.5（全模态版）勾上；未知 / false 维持现状走 STT 老路径。
     */
    supportsAudioInput?: boolean;
  }
> = {
  'mimo-v2.5-pro': {
    label: 'MiMo v2.5 Pro',
    vendor: 'xiaomi',
    inputPrice: '¥1.4 / 1M',
    outputPrice: '¥21 / 1M',
    hint: '中文友好 · 综合质量最佳',
    isDefault: true,
    supportsVision: false,
    supportsToolCalls: true,
  },
  'mimo-v2.5': {
    label: 'MiMo v2.5',
    vendor: 'xiaomi',
    inputPrice: '¥0.56 / 1M',
    outputPrice: '¥14 / 1M',
    hint: '推荐 · 全模态 · 支持语音 · 可做模拟语音面试',
    supportsVision: false,
    supportsToolCalls: true,
    supportsAudioInput: true,
  },
  'gpt-5.4': {
    label: 'GPT-5.4',
    vendor: 'openai',
    inputPrice: '$2.5 / 1M',
    outputPrice: '$15 / 1M',
    hint: '通用首选',
    supportsVision: true,
    supportsToolCalls: true,
  },
};

/** 模型是否能跟着 muicv 走完整 agent 流程（多轮工具调用）。未知 id 默认 true。 */
export function modelSupportsToolCalls(modelId: string): boolean {
  return LLM_DISPLAY_META[modelId]?.supportsToolCalls ?? true;
}

/** 平台路径下当前 model id 是否能接受图像 input。未知 id 默认按"不支持"算，避免再炸 404。 */
export function modelSupportsVision(modelId: string): boolean {
  return LLM_DISPLAY_META[modelId]?.supportsVision ?? false;
}

/**
 * 当前 model 是否原生吃音频 input（跳过 STT 直传 input_audio）。
 * 未知 id 默认 false——稳妥地走 STT 老路径，避免误把音频喂给纯文本模型炸 400。
 */
export function modelSupportsAudioInput(modelId: string): boolean {
  return LLM_DISPLAY_META[modelId]?.supportsAudioInput ?? false;
}

/**
 * 支持的展示币种。**结算币种 = Stripe Price 的 currency**（每个 price 一个 currency），
 * 本枚举只控制 UI 文案 + 选哪个 priceId 进 Checkout，不直接进 Stripe 调用。
 */
export type Currency = 'usd' | 'cny';

/**
 * 订阅档位：每个 cycle（月付每月 / 年付每年）自动续 tokens。
 * 年付 = Stripe 一年 invoice 一次，invoice.paid 时一次性发 yearly.tokens（标准 SaaS 做法）。
 *
 * tokens 字段单位：**显示 token**（webhook 入账时 displayToMicro 转 μ 后调 credit）。同档 USD / CNY token 数相同。
 *
 * 数据来源 / 维护：
 *   - tokens / display：本文件硬编码，调价时改这里 + Stripe Dashboard 同步
 *   - Stripe price ID：在 packages/website/lib/stripe-prices.ts 的常量表里给
 *     （结构 plan × interval × currency，详见 lib/stripe.ts 的 priceIdToCycleTokens）
 *   - savingsLabel：年付的折扣展示文案，纯 UI 用，按币种分别给
 *
 * **设计原则（issue #4 重定价，2026-05-08）**：订阅基本贴成本（月付微利、年付微亏），
 * 利润中心放在 TOPUP_PACKS。年付亏的部分等于「为留客户付的市场费」。
 *
 * **满载毛利率**（按 token 全部用完最坏情况估算）：
 * 锚点 1 显示 token = $1e-5；token 价格 = 上游 × 1.1；
 * 余额面值 = tokens × $1e-5；上游成本 = 面值 / 1.1；毛利 = 售价 - 上游成本。
 *
 * USD 档：
 *   | 档位        | 售价     | tokens | 面值     | 上游成本 | 满载毛利   | 毛利率   |
 *   | ---------- | -------- | ------ | -------- | -------- | --------- | -------- |
 *   | Pro 月付   | $4.88    | 500k   | $5.00    | $4.55    | +$0.33    | +6.8%    |
 *   | Pro 年付   | $48.88   | 6M     | $60.00   | $54.55   | -$5.67    | -11.6%   |
 *   | Max 月付   | $15.88   | 1.7M   | $17.00   | $15.45   | +$0.43    | +2.7%    |
 *   | Max 年付   | $158.88  | 20M    | $200.00  | $181.82  | -$22.94   | -14.4%   |
 *
 * CNY 档（售价 = USD × 6.8 → 整数 + .88；结算 FX 仍按 ¥7/$，等于让利 ~2.9%）：
 *   | 档位        | 售价 ¥    | 售价 $   | 上游 $   | 满载毛利 $ | 毛利率   |
 *   | ---------- | -------- | -------- | -------- | --------- | -------- |
 *   | Pro 月付   | ¥33.88   | $4.84    | $4.55    | +$0.30    | +6.1%    |
 *   | Pro 年付   | ¥332.88  | $47.55   | $54.55   | -$6.99    | -14.7%   |
 *   | Max 月付   | ¥107.88  | $15.41   | $15.45   | -$0.04    | -0.3%（贴成本）|
 *   | Max 年付   | ¥1080.88 | $154.41  | $181.82  | -$27.41   | -17.8%   |
 *
 * 年付 = 月付 × 10 价 ≈ 月付 × 12 token：「10 个月的钱买 12 个月的量」，单价省 ≈ 17%。
 * Max 年付 token 砍到 20M（严格 12 倍是 20.4M）让数字 round + 少亏 2%。
 */
export const SUBSCRIPTION_PLANS = {
  pro: {
    label: 'Pro',
    monthly: {
      tokens: 500_000,
      display: { usd: '$4.88 / 月', cny: '¥33.88 / 月' },
    },
    yearly: {
      tokens: 6_000_000,
      display: { usd: '$48.88 / 年', cny: '¥332.88 / 年' },
      savingsLabel: { usd: '相当于 $4.07 / 月，省 17%', cny: '相当于 ¥27.74 / 月，省 17%' },
    },
  },
  max: {
    label: 'Max',
    monthly: {
      tokens: 1_700_000,
      display: { usd: '$15.88 / 月', cny: '¥107.88 / 月' },
    },
    yearly: {
      tokens: 20_000_000,
      display: { usd: '$158.88 / 年', cny: '¥1080.88 / 年' },
      savingsLabel: { usd: '相当于 $13.24 / 月，省 17%', cny: '相当于 ¥90.07 / 月，省 17%' },
    },
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;
export type BillingInterval = 'monthly' | 'yearly';

/**
 * 会员档位的中文展示名（free + Pro/Max）。app 设置页 / 侧边栏用户菜单等
 * 多处都要展示，统一在这里维护，避免各端各写一份。
 *
 * 未知 plan（包括 server 漏返字段）走 fallback：直接回显 plan 字符串；空值兜底为「免费版」。
 */
const PLAN_LABEL_ZH = {
  free: '免费版',
  pro: 'Pro 会员',
  max: 'Max 会员',
} as const satisfies Record<string, string>;

export function getPlanLabel(plan: string | null | undefined): string {
  if (!plan) return PLAN_LABEL_ZH.free;
  return (PLAN_LABEL_ZH as Record<string, string>)[plan] ?? plan;
}

/**
 * 一次性补充包：付完款 webhook 立刻 +tokens（显示 token，credit 时转 μ）。
 * display 仅展示用，真实价格在 Stripe price 上。同档 USD / CNY token 数相同。
 *
 * **设计原则（issue #4 重定价，2026-05-08）**：本档承担主要利润，毛利率梯度 32% / 26% / 20%。
 * 故意做成"买得越多单价越低，但永远比订阅贵"，引导高频用户走订阅。
 *
 * **满载毛利率**（同 SUBSCRIPTION_PLANS 口径）：
 *
 * USD 档：
 *   | 档位     | 售价     | tokens | 面值     | 上游成本 | 满载毛利 | 毛利率  | tokens 单价 |
 *   | ------- | -------- | ------ | -------- | -------- | -------- | ------- | ----------- |
 *   | small   | $1.88    | 140k   | $1.40    | $1.27    | +$0.61   | +32.4%  | $13.43/M    |
 *   | medium  | $5.88    | 480k   | $4.80    | $4.36    | +$1.52   | +25.8%  | $12.25/M    |
 *   | large   | $19.88   | 1.75M  | $17.50   | $15.91   | +$3.97   | +20.0%  | $11.36/M    |
 *
 * CNY 档（USD × 6.8 → 整数 + .88；结算 FX ¥7/$）：
 *   | 档位     | 售价 ¥   | 售价 $   | 上游 $   | 满载毛利 $ | 毛利率   |
 *   | ------- | -------- | -------- | -------- | --------- | -------- |
 *   | small   | ¥12.88   | $1.84    | $1.27    | +$0.57    | +30.9%   |
 *   | medium  | ¥39.88   | $5.70    | $4.36    | +$1.33    | +23.4%   |
 *   | large   | ¥135.88  | $19.41   | $15.91   | +$3.50    | +18.0%   |
 *
 * 阶梯参考：Pro 月付 $9.76/M，Max 月付 $9.34/M（topup 永远贵于订阅）。
 */
export const TOPUP_PACKS = {
  small: { tokens: 140_000, display: { usd: '$1.88', cny: '¥12.88' } },
  medium: { tokens: 480_000, display: { usd: '$5.88', cny: '¥39.88' } },
  large: { tokens: 1_750_000, display: { usd: '$19.88', cny: '¥135.88' } },
} as const;

export type TopupPackKey = keyof typeof TOPUP_PACKS;

/**
 * CN 用户的「月包 / 年包」一次性 SKU。
 *
 * 为什么存在：WeChat Pay 不支持 recurring（Stripe 全平台限制），Alipay 在本账户也被
 * Stripe 拒绝进 subscription mode。所以把 Pro/Max × 月/年 4 个订阅档做成一次性付款，
 * 走 topup 路径（mode=payment）+ WeChat/Alipay/Card 三方支付，靠 cooldownDays 闸门
 * 实现「一个周期只能买一次」的订阅感。
 *
 * token 量 = 对应订阅档（SUBSCRIPTION_PLANS.pro.monthly.tokens 等）。永不过期，立即到账。
 * cooldownDays = 「周期」长度；同周期全锁（详见 lib/cn-pack.ts 的 getCnPackCooldownEnd）：
 *   买任意月包 → 30 天内不能再买任何月包（但能买年包）
 *   买任意年包 → 365 天内不能再买任何年包
 *
 * 没有自动续费 / 到期提醒（不是订阅）。退款不退 token（与 USD topup 现状一致）。
 */
export const CN_PACKS = {
  'pro-monthly': {
    tokens: SUBSCRIPTION_PLANS.pro.monthly.tokens,
    cooldownDays: 30,
    label: 'Pro 月包',
    display: { cny: '¥33.88' },
  },
  'pro-yearly': {
    tokens: SUBSCRIPTION_PLANS.pro.yearly.tokens,
    cooldownDays: 365,
    label: 'Pro 年包',
    display: { cny: '¥332.88' },
  },
  'max-monthly': {
    tokens: SUBSCRIPTION_PLANS.max.monthly.tokens,
    cooldownDays: 30,
    label: 'Max 月包',
    display: { cny: '¥107.88' },
  },
  'max-yearly': {
    tokens: SUBSCRIPTION_PLANS.max.yearly.tokens,
    cooldownDays: 365,
    label: 'Max 年包',
    display: { cny: '¥1080.88' },
  },
} as const;

export type CnPackKey = keyof typeof CN_PACKS;
export type CnPackPeriod = 'monthly' | 'yearly';

/** CN 包的 period（同周期全锁需要据此判定）。key 命名形如 '<tier>-<period>'。 */
export function cnPackPeriod(k: CnPackKey): CnPackPeriod {
  return k.endsWith('-monthly') ? 'monthly' : 'yearly';
}

export type LedgerType =
  | 'signup_bonus'
  | 'subscription'
  | 'topup'
  | 'cn_pack'
  | 'llm'
  | 'pdf_render'
  | 'jd_fetch'
  | 'stt_transcribe'
  | 'admin_grant'
  | 'admin_deduct'
  | 'feedback_reward';

/**
 * LLM 上游用量 → μtoken 实扣金额。
 *
 * 公式：
 *   fresh = max(prompt - cached, 0)
 *   cost  = fresh × inputRate + cached × cachedInputRate + completion × outputRate
 *   返回   ceil(cost × LLM_RATIO × TOKEN_PRECISION)
 *
 * **OpenAI 约定**：cached_tokens 已包含在 prompt_tokens 里（不另加），所以要减出来再算价。
 * 异常输入（cached > prompt、负数）clamp 到合法区间。
 *
 * 取整在 μtoken 层（4 位精度），过去整数 ceil 在显示 token 层，会让 mimo-v2.5 这种
 * 廉价模型的小请求被多扣 100×+。
 *
 * @returns μtoken（integer）；model 不在 LLM_PRICING 表里返回 null
 */
export function computeLlmCharge(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0,
): number | null {
  const rate = LLM_PRICING[model];
  if (!rate) return null;
  const prompt = Math.max(promptTokens || 0, 0);
  const completion = Math.max(completionTokens || 0, 0);
  const cached = Math.min(Math.max(cachedTokens || 0, 0), prompt);
  const fresh = prompt - cached;
  const cost = fresh * rate.inputRate + cached * rate.cachedInputRate + completion * rate.outputRate;
  return Math.ceil(cost * LLM_RATIO * TOKEN_PRECISION);
}

/**
 * OpenAI 兼容的 402 错误响应体。桌面 app 用的 OpenAI Agent SDK 看到 4xx +
 * `{ error: { message, type, code } }` 会抛 APIError，前端检测 code 弹充值对话框。
 *
 * @param balanceMicro 余额（μtoken），内部转成显示 token 后写进文案
 */
export function insufficientBalanceError(balanceMicro: number): {
  error: { message: string; type: string; code: string; param: null };
} {
  const display = microToDisplay(balanceMicro);
  return {
    error: {
      message: `余额不足（剩 ${display.toLocaleString()} tokens）。请到 muicv.com/dashboard 充值或订阅月卡。`,
      type: 'insufficient_balance',
      code: 'insufficient_balance',
      param: null,
    },
  };
}
