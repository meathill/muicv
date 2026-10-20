import { displayToMicro } from '../pricing.ts';
import type { LocationRestrictions, Workplace } from './location.ts';

/**
 * 扩展「任意页面提交岗位」的请求 / 响应与计费规则。api 与 extension 共用。
 *
 * 计费（显示 token，见 pricing.ts 的单位约定）：
 *   - 提交前按 markdown 长度预扣 `estimateSubmitHoldMicro`，余额不足直接 402
 *   - 公共池 + 识别到岗位：全免（重复 / 入库失败也不扣）；至少一条新岗位入库再发奖励
 *   - 没识别到岗位、或私藏：按实际 Workers AI 用量结算（不超过预扣额），多退
 */

export const JOB_SUBMIT_VISIBILITIES = ['public', 'private'] as const;
export type JobSubmitVisibility = (typeof JOB_SUBMIT_VISIBILITIES)[number];

/** 判别 / 抽取用的廉价模型。 */
export const JOB_SUBMIT_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
/** 1 个上游 token 折合显示 token。约为 Workers AI 刊例（$0.045 / $0.384 每百万）的 2 倍。 */
export const JOB_SUBMIT_INPUT_RATE = 0.01;
export const JOB_SUBMIT_OUTPUT_RATE = 0.08;
/** 每次 AI 调用的提示词开销与输出上限（token）。 */
export const JOB_SUBMIT_PROMPT_OVERHEAD = 600;
export const JOB_SUBMIT_MAX_OUTPUT = 1200;

/** 客户端截断上限与服务端拒收上限（字符）。 */
export const JOB_SUBMIT_CLIENT_MARKDOWN_CAP = 20_000;
export const JOB_SUBMIT_MAX_MARKDOWN = 24_000;
export const JOB_SUBMIT_MAX_LINKS = 200;
export const JOB_SUBMIT_MAX_JSONLD = 20;
/** 服务端最多跟进抓取的候选链接数，以及每条链接送进 AI 的正文上限。 */
export const JOB_SUBMIT_MAX_FOLLOW = 3;
export const JOB_SUBMIT_LINK_TEXT_CAP = 8_000;
/** 一次提交最多入库的岗位数。 */
export const JOB_SUBMIT_MAX_JOBS = 10;

/** 新岗位奖励：首条 2000，之后每条 +500，最多算 5 条。每日发奖次数沿用 JD_CONTRIBUTE_DAILY_CAP。 */
export const JOB_SUBMIT_REWARD = 2000;
export const JOB_SUBMIT_REWARD_PER_EXTRA = 500;
export const JOB_SUBMIT_REWARD_MAX_JOBS = 5;

/** 最低预扣额（显示 token）。 */
export const JOB_SUBMIT_MIN_HOLD = 50;

export type JobSubmitRequest = {
  url: string;
  title: string;
  markdown: string;
  jsonLd: unknown[];
  links: Array<{ url: string; text: string }>;
  visibility: JobSubmitVisibility;
};

export type JobSubmitMethod = 'jsonld' | 'ats' | 'ai' | 'none';

export type SubmittedJob = {
  title: string;
  company: string;
  location: string;
  workplace: Workplace;
  url: string;
  /** new = 本次新入库；duplicate = 已存在；failed = 入库失败。 */
  status: 'new' | 'duplicate' | 'failed';
  /** muicv.com 上的落地页（公共池）；私藏为 null。 */
  link: string | null;
  restrictions: string;
};

export type JobSubmitResponse = {
  id: string;
  visibility: JobSubmitVisibility;
  method: JobSubmitMethod;
  jobs: SubmittedJob[];
  found: number;
  created: number;
  duplicates: number;
  /** 显示 token。 */
  charged: number;
  rewarded: number;
  balance: number;
  /** 没识别到岗位时给用户的说明。 */
  note?: string;
};

function aiCostDisplay(inputTokens: number, outputTokens: number): number {
  return inputTokens * JOB_SUBMIT_INPUT_RATE + outputTokens * JOB_SUBMIT_OUTPUT_RATE;
}

/** 按 markdown 长度估算最坏情况：1 次判别 + JOB_SUBMIT_MAX_FOLLOW 次链接抽取。返回 μtoken。 */
export function estimateSubmitHoldMicro(markdownChars: number): number {
  const pageTokens = Math.ceil(Math.max(markdownChars, 0) / 3) + JOB_SUBMIT_PROMPT_OVERHEAD;
  const linkTokens = JOB_SUBMIT_MAX_FOLLOW * (Math.ceil(JOB_SUBMIT_LINK_TEXT_CAP / 3) + JOB_SUBMIT_PROMPT_OVERHEAD);
  const calls = 1 + JOB_SUBMIT_MAX_FOLLOW;
  const display = Math.max(aiCostDisplay(pageTokens + linkTokens, calls * JOB_SUBMIT_MAX_OUTPUT), JOB_SUBMIT_MIN_HOLD);
  return Math.ceil(displayToMicro(display));
}

/** 实际 AI 用量 → μtoken。 */
export function submitAiCostMicro(inputTokens: number, outputTokens: number): number {
  return Math.ceil(displayToMicro(aiCostDisplay(Math.max(inputTokens, 0), Math.max(outputTokens, 0))));
}

/** 新岗位奖励（μtoken）。 */
export function submitRewardMicro(newJobs: number): number {
  if (newJobs <= 0) return 0;
  const extra = Math.min(newJobs, JOB_SUBMIT_REWARD_MAX_JOBS) - 1;
  return displayToMicro(JOB_SUBMIT_REWARD + extra * JOB_SUBMIT_REWARD_PER_EXTRA);
}

export type SubmitSettleInput = {
  visibility: JobSubmitVisibility;
  /** 识别到的岗位数（含重复）。 */
  found: number;
  /** 新入库的公共岗位数。 */
  created: number;
  costMicro: number;
  holdMicro: number;
  /** 今日发奖次数是否已达上限。 */
  rewardCapped: boolean;
};

export type SubmitSettlement = { chargeMicro: number; refundMicro: number; rewardMicro: number };

/** 结算规则（纯函数，见文件头）。 */
export function settleSubmission(input: SubmitSettleInput): SubmitSettlement {
  const hold = Math.max(input.holdMicro, 0);
  if (input.visibility === 'public' && input.found > 0) {
    const rewardMicro = input.rewardCapped ? 0 : submitRewardMicro(input.created);
    return { chargeMicro: 0, refundMicro: hold, rewardMicro };
  }
  const chargeMicro = Math.min(Math.max(Math.ceil(input.costMicro), 0), hold);
  return { chargeMicro, refundMicro: hold - chargeMicro, rewardMicro: 0 };
}

export type SavedJobRestrictions = Pick<
  LocationRestrictions,
  'allowedCountries' | 'allowedRegions' | 'utcOffsetMin' | 'utcOffsetMax' | 'officeLocations'
>;

/** 需要 AI / 外链抓取的提交走队列：POST 返回 202 + id，客户端轮询 GET /jobs/submit/:id。 */
export type JobSubmitAccepted = { id: string; status: 'queued' };

export type JobSubmitStatusValue = 'held' | 'queued' | 'settled' | 'failed' | 'rejected';

export type JobSubmitStatus = {
  id: string;
  status: JobSubmitStatusValue;
  /** settled / failed 时有结果 */
  result: JobSubmitResponse | null;
};

/** 客户端轮询退避（毫秒），最后一档重复直到超时。 */
export const JOB_SUBMIT_POLL_BACKOFF = [1500, 2000, 3000, 5000, 8000];
export const JOB_SUBMIT_POLL_TIMEOUT_MS = 3 * 60 * 1000;
