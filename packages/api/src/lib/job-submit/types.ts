/** 流水线内部的「候选岗位」：识别 / 抽取阶段的统一产物，入库前再解析地域。 */
export type CandidateJob = {
  title: string;
  company: string;
  location: string;
  /** ATS workplaceType / JSON-LD jobLocationType / AI 判断 */
  workplaceHint?: string | boolean | undefined;
  url: string;
  /** 纯文本 / markdown 正文 */
  body: string;
  employmentType?: string | undefined;
};

export type AiUsage = { inputTokens: number; outputTokens: number };

export type TextAi = { run(model: string, input: Record<string, unknown>): Promise<unknown> };
