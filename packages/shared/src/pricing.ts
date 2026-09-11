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
 * 锚点：1 显示 token ≈ $1e-5（从 Pro 套餐反推：500k / $4.88）。上游价以 ¥7/USD 折算到 USD 后再算 rate。
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
 * TTS 合成按输入文本字符数扣 token（unicode code point 计数，显示 token / 字符）。
 * 折算 $0.00003 / 字符，一段 300 字的面试回答点评 ≈ 900 token ≈ $0.009。
 * 对标 OpenAI tts-1 刊例（$15 / 1M chars）打了对折——上游 Xiaomi MiMo-V2.5-TTS
 * 目前限时免费、平台近乎零成本，恢复收费前先让用户养成习惯，届时再校准。
 */
export const TTS_RATE_PER_CHAR = 3;

/** TTS 单次合成文本长度上限（code point），防滥用；超过直接 400。 */
export const TTS_MAX_TEXT_CHARS = 2000;

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
 * 平台 LLM 上游标识。**查表分流**的唯一依据，routes/llm.ts 据此选 base + secret。
 *   - openai：GPT-5.6 家族直连 api.openai.com（premium 升级档）
 *   - opencode-go：OpenCode Go 包月订阅（https://opencode.ai/zen/go），文字主力 +
 *     语音理解全部走它，成本锁死在订阅费内。量大了切 zen 按量付费。
 */
export type LlmUpstream = 'openai' | 'opencode-go';

/**
 * LLM 计费表。每个 model 一项：
 *   - upstream：走哪个上游（LLM_UPSTREAMS）
 *   - inputRate：1 上游 prompt token 折合多少显示 token
 *   - cachedInputRate：1 上游 prompt cache 命中 token 折合多少显示 token（≤ inputRate）
 *   - outputRate：1 上游 completion token 折合多少显示 token
 *
 * 数值以「1 显示 token = $1e-5」为锚点反算。
 *
 * cached_tokens 由上游 usage 提供，注意 OpenAI 约定下它**已计入**
 * prompt_tokens，扣账时要减出新鲜部分单独算价。
 * 数据来源（review 时核对）：
 *   - gpt-5.6-luna：developers.openai.com 官方刊例 $0.20 / $0.02 cached / $1.20 per 1M（2026-08 校准）
 *   - gpt-5.6-terra：同上 $2 / $0.2 / $12
 *   - gpt-5.6-sol：同上 $4 / $0.4 / $20
 *   - deepseek-v4.1-flash / mimo-v2.5：OpenCode Go 包月供给，边际成本≈配额摊销；
 *     价格对齐各厂商公开 API 价位段取整，包月期内偏毛利（quota 内近乎零成本）
 *
 * 平台路径（余额 > 0）只接受表里的 model；表外 model 在 routes/llm.ts 拦截 400。
 * muirouter fallback 路径不受本表约束（model 列表由 muirouter 端管理）。
 */
// 声明顺序 = ModelCard / 设置页的可视顺序：默认文本模型在前，
// 语音理解专用次之，最后是 GPT-5.6 升级梯队。
export const LLM_PRICING: Record<
  string,
  { upstream: LlmUpstream; inputRate: number; cachedInputRate: number; outputRate: number }
> = {
  // OpenCode Go 包月，DeepSeek V4.1 Flash 快而便宜、原生多模态、工具调用强——日常对话主力
  'deepseek-v4.1-flash': { upstream: 'opencode-go', inputRate: 0.02, cachedInputRate: 0.002, outputRate: 0.08 },
  // 同 id 从 Xiaomi 直连迁到 OpenCode Go（价格不变，用户无感）；语音理解 / 音频直通专用
  'mimo-v2.5': { upstream: 'opencode-go', inputRate: 0.008, cachedInputRate: 0.008, outputRate: 0.2 },
  // 上游 $0.20 / cached $0.02 / output $1.20 per 1M —— 重推理性价比档，默认 xhigh
  'gpt-5.6-luna': { upstream: 'openai', inputRate: 0.02, cachedInputRate: 0.002, outputRate: 0.12 },
  // 上游 $2 / $0.2 / $12 per 1M —— balanced 升级档
  'gpt-5.6-terra': { upstream: 'openai', inputRate: 0.2, cachedInputRate: 0.02, outputRate: 1.2 },
  // 上游 $4 / $0.4 / $20 per 1M —— 旗舰升级档
  'gpt-5.6-sol': { upstream: 'openai', inputRate: 0.4, cachedInputRate: 0.04, outputRate: 2.0 },
};

/** markup：所有 model 统一 1.1×。等于「上游成本 + 10% 加价」。 */
export const LLM_RATIO = 1.1;

/**
 * 历史/别名模型兼容映射。当客户端或老配置请求别名模型时，自动重定向到兼容的目标模型。
 * 例如：
 *   - deepseek-v4-flash 下架后兼容重定向到 deepseek-v4.1-flash
 *   - deepseek-v4-flash-vision-exp 是已移除的视觉实验变体，旧客户端带图时仍会发它，
 *     也重定向到 4.1（多模态）避免 400
 *   - mimo-v2.5-pro 下架后兼容重定向到 deepseek-v4.1-flash
 *   - gpt-5.4 / gpt-5.5 升级重定向到同档位的 gpt-5.6-sol
 */
export const LLM_MODEL_ALIASES: Record<string, string> = {
  'deepseek-v4-flash': 'deepseek-v4.1-flash',
  'deepseek-v4-flash-vision-exp': 'deepseek-v4.1-flash',
  'mimo-v2.5-pro': 'deepseek-v4.1-flash',
  'gpt-5.4': 'gpt-5.6-sol',
  'gpt-5.5': 'gpt-5.6-sol',
};

/** 解析别名。若有兼容别名则返回目标模型名，否则返回原始字符串。 */
export function resolveModelAlias(model: string | null | undefined): string | null | undefined {
  if (typeof model === 'string' && Object.hasOwn(LLM_MODEL_ALIASES, model)) {
    return LLM_MODEL_ALIASES[model];
  }
  return model;
}

export function isSupportedLlmModel(model: string): boolean {
  return Object.hasOwn(LLM_PRICING, model);
}

/** 平台路径支持的 model id 列表，给 400 响应/前端选择 UI 用。 */
export const SUPPORTED_LLM_MODELS = Object.keys(LLM_PRICING);

/** 全平台默认模型 id。新装 / 老 store 里没设过时回退到这个；UI 也按 isDefault 标识。 */
export const DEFAULT_LLM_MODEL = 'deepseek-v4.1-flash';

/**
 * 校验 / 回退用户保存的 model id。优先解析兼容别名，未知静默回退到默认，不弹窗。
 * 桌面 app settings 读盘后、发起 LLM 请求前都该过一遍这个函数，避免老用户被旧 id 卡住。
 */
export function normalizeModel(model: string | null | undefined): string {
  const resolved = resolveModelAlias(model);
  if (!resolved || !Object.hasOwn(LLM_PRICING, resolved)) return DEFAULT_LLM_MODEL;
  return resolved;
}

/**
 * reasoning effort 可调档位。Agent.modelSettings.providerData 按端点形状注入：
 * responses → `reasoning: { effort }`；chat_completions → `reasoning_effort`。
 */
export const REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/**
 * UI 展示元数据：人类可读名 / 上游 vendor / 输入输出价（保留原币种以便用户判断）/ 简短亮点。
 * 桌面 app 设置页的 ModelCard 用，避免在组件里硬编码字符串。
 */
export const LLM_DISPLAY_META: Record<
  string,
  {
    label: string;
    vendor: LlmUpstream;
    inputPrice: string;
    outputPrice: string;
    hint: string;
    /** true 表示这是全平台默认，UI 加 "默认" chip，并在 store 里没值时落到它。 */
    isDefault?: boolean;
    /**
     * 该模型是否接受 reasoning.effort 参数（设置页据此出「推理力度」选择器）。
     * 当前只有 OpenAI GPT-5.6 家族；DeepSeek / mimo 由服务端固定策略，不暴露调节。
     */
    supportsReasoningEffort?: boolean;
    /**
     * 当前 muicv 平台路径下该 model id 是否能接受图像 input。
     * 模型本身能力 ≠ 平台路由能力——GPT-5.6 系走 OpenAI 原生 vision；
     * DeepSeek V4.1 Flash 起原生多模态，直接吃图；mimo 系与纯文本档保守关掉避免误发图炸 400。
     */
    supportsVision: boolean;
    /**
     * 是否兼容 muicv 的 multi-turn 工具调用（agent 流程）。
     * thinking-mode 推理模型要求把上一轮 assistant 的 reasoning_content 字段回传，
     * main 进程有透传层（reasoning-capture.ts）处理，当前全表 true。
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
  'deepseek-v4.1-flash': {
    label: 'DeepSeek V4.1 Flash',
    vendor: 'opencode-go',
    inputPrice: '$0.20 / 1M',
    outputPrice: '$0.80 / 1M',
    hint: '默认 · 多模态 · 快而便宜 · agent 工具调用首选',
    isDefault: true,
    supportsVision: true,
    supportsToolCalls: true,
  },
  'mimo-v2.5': {
    label: 'MiMo v2.5',
    vendor: 'opencode-go',
    inputPrice: '$0.80 / 1M',
    outputPrice: '$2.00 / 1M',
    hint: '推荐 · 全模态 · 支持语音 · 可做模拟语音面试',
    supportsVision: false,
    supportsToolCalls: true,
    supportsAudioInput: true,
  },
  'gpt-5.6-luna': {
    label: 'GPT-5.6 Luna',
    vendor: 'openai',
    inputPrice: '$0.20 / 1M',
    outputPrice: '$1.20 / 1M',
    hint: '重推理性价比档 · 默认 xhigh 力度 · 可调思考深度',
    supportsReasoningEffort: true,
    supportsVision: true,
    supportsToolCalls: true,
  },
  'gpt-5.6-terra': {
    label: 'GPT-5.6 Terra',
    vendor: 'openai',
    inputPrice: '$2 / 1M',
    outputPrice: '$12 / 1M',
    hint: 'balanced 升级档 · 重活复杂任务 · 可调思考深度',
    supportsReasoningEffort: true,
    supportsVision: true,
    supportsToolCalls: true,
  },
  'gpt-5.6-sol': {
    label: 'GPT-5.6 Sol',
    vendor: 'openai',
    inputPrice: '$4.00 / 1M',
    outputPrice: '$20.00 / 1M',
    hint: '旗舰升级档 · 最强综合能力 · 可调思考深度',
    supportsReasoningEffort: true,
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
 * 当前 model 是否接受 reasoning effort 调节。未知 id 默认 false——
 * 不知道上游认不认这个参数时就不注入，保守不炸 400。
 */
export function modelSupportsReasoningEffort(modelId: string): boolean {
  return LLM_DISPLAY_META[modelId]?.supportsReasoningEffort ?? false;
}

/** 把非法 / 旧版本档位值收敛到合法集合（读盘兜底用）。 */
export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return (REASONING_EFFORTS as readonly unknown[]).includes(value) ? (value as ReasoningEffort) : 'xhigh';
}

/**
 * 支持的展示币种。**结算币种 = Stripe Price 的 currency**（每个 price 一个 currency），
 * 本枚举只控制 UI 文案 + 选哪个 priceId 进 Checkout，不直接进 Stripe 调用。
 *
 * 注意：人民币**不能用于订阅**——Stripe 本账户不支持 CNY recurring（Alipay 进不了
 * subscription mode，WeChat Pay 全平台不支持 recurring）。¥ CN 只用于一次性补充包
 * （微信 / 支付宝 / 卡）。订阅只卖 USD。
 */
export type Currency = 'usd' | 'cny';

/**
 * 订阅档位：每个 cycle（月付每月 / 年付每年）自动续 tokens。
 * 年付 = Stripe 一年 invoice 一次，invoice.paid 时一次性发 yearly.tokens（标准 SaaS 做法）。
 *
 * tokens 字段单位：**显示 token**（webhook 入账时 displayToMicro 转 μ 后调 credit）。
 *
 * **订阅只卖 USD**。人民币不能走订阅（Stripe 本账户不支持 CNY recurring），
 * ¥ CN 用户只能买 TOPUP_PACKS 补充包。详见 Currency 类型注释。
 *
 * 数据来源 / 维护：
 *   - tokens / display：本文件硬编码，调价时改这里 + Stripe Dashboard 同步
 *   - Stripe price ID：在同包的 stripe-prices.ts（structure plan × interval，USD only），
 *     website / api 两端共用同一份
 *   - savingsLabel：年付的折扣展示文案，纯 UI 用
 *
 * **设计原则（issue #4 重定价，2026-05-08；2026-09 年付降 token）**：订阅基本贴成本
 * （月付微利、年付微亏），利润中心放在 TOPUP_PACKS。订阅折扣的本质是赌用户不会把额度
 * 用完，不追求「满载保本」。
 *
 * **年付 = 付 10 个月的钱、约 11 个月用量**（月付 × 11 量）：
 * 年付售价 = 月付 × 10；token ≈ 月付 × 11 → 每 token 单价省 ≈ 9%。
 * （2026-09 前是 ×12 量 = 单价省 17%，满载亏 11~14%；收回到 ×11 后满载只亏 2~8%。）
 *
 * **满载毛利率**（按 token 全部用完的最坏情况估算，**未计 Stripe 手续费**）：
 * 锚点 1 显示 token = $1e-5；token 价格 = 上游 × 1.1；
 * 余额面值 = tokens × $1e-5；上游成本 = 面值 / 1.1；毛利 = 售价 - 上游成本。
 *
 * 注意这只是「满载用光」的理论下限：Stripe 手续费（约 2.9% + $0.30/笔，海外卡更高）
 * 会让实际毛利再降约 9 个点（Pro 月付规模），Pro 月付满载实为微亏。真正健康的利润
 * 来自 TOPUP_PACKS。
 *
 *   | 档位      | 售价     | tokens  | 面值     | 上游成本 | 满载毛利 | 毛利率 | tokens 单价 |
 *   | --------- | -------- | ------- | -------- | -------- | -------- | ------ | ----------- |
 *   | Pro 月付  | $4.88    | 500k    | $5.00    | $4.55    | +$0.33   | +6.8%  | $9.76/M     |
 *   | Pro 年付  | $48.88   | 5.5M    | $55.00   | $50.00   | -$1.12   | -2.3%  | $8.89/M     |
 *   | Max 月付  | $15.88   | 1.7M    | $17.00   | $15.45   | +$0.43   | +2.7%  | $9.34/M     |
 *   | Max 年付  | $158.88  | 18.8M   | $188.00  | $170.91  | -$12.03  | -7.6%  | $8.45/M     |
 */
export const SUBSCRIPTION_PLANS = {
  pro: {
    label: 'Pro',
    monthly: {
      tokens: 500_000,
      display: { usd: '$4.88 / 月' },
    },
    yearly: {
      tokens: 5_500_000,
      display: { usd: '$48.88 / 年' },
      savingsLabel: { usd: '相当于 $4.07 / 月，省 ≈9%' },
    },
  },
  max: {
    label: 'Max',
    monthly: {
      tokens: 1_700_000,
      display: { usd: '$15.88 / 月' },
    },
    yearly: {
      tokens: 18_800_000,
      display: { usd: '$158.88 / 年' },
      savingsLabel: { usd: '相当于 $13.24 / 月，省 ≈9%' },
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
 *
 * 2026-09 起人民币不能订阅（只卖补充包），CN 用户的唯一购买入口就是本档（¥ 价）。
 * 本档是平台的利润中心，也是唯一扛得住 Stripe 手续费的一档。
 */
export const TOPUP_PACKS = {
  small: { tokens: 140_000, display: { usd: '$1.88', cny: '¥12.88' } },
  medium: { tokens: 480_000, display: { usd: '$5.88', cny: '¥39.88' } },
  large: { tokens: 1_750_000, display: { usd: '$19.88', cny: '¥135.88' } },
} as const;

export type TopupPackKey = keyof typeof TOPUP_PACKS;

export type LedgerType =
  | 'signup_bonus'
  | 'subscription'
  | 'topup'
  /**
   * 历史遗留：2026-09 前的「CN 月包/年包」（人民币一次性付款绕过 Stripe recurring 限制）。
   * 该产品已下线，新流水不会再产生；保留枚举值仅为让历史 ledger 行仍能正确映射类型与文案。
   */
  | 'cn_pack'
  | 'llm'
  | 'pdf_render'
  | 'jd_fetch'
  | 'stt_transcribe'
  | 'tts'
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
