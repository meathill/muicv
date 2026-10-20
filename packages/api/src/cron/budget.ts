/**
 * 每次 scheduled 运行的子请求预算（Workers Paid 1000 / Free 50；fetch 与 binding 调用都按上限保守计）。
 *
 * 固定开销：每个数据源 1 次 fetch + CMS 取已有键 1 + CMS 批量过期 1 + D1 upsert/过期 2 + 向量删除 1 + 余量 3。
 * 每条新岗位：CMS 新建 1 + 向量嵌入 1/50（bge-m3 按 50 条一批）+ 向量 upsert（≤500 一批，计入余量）。
 * LLM 兜底每次 1 个子请求，从剩余预算里优先给岗位写入，最多 maxLlm 次。
 */
export type CollectBudget = { maxNew: number; maxLlm: number; sources: number };

const FIXED = 8;

export function planCollectBudget(options: {
  budget: number;
  sources: number;
  maxNew: number;
  maxLlm: number;
}): CollectBudget {
  const available = Math.max(options.budget - options.sources - FIXED, 0);
  // 每条约 1.02 个子请求（1 次 CMS 写 + 1/50 次嵌入）
  const maxNew = Math.min(options.maxNew, Math.floor(available / 1.02));
  const left = available - Math.ceil(maxNew * 1.02);
  const maxLlm = Math.max(Math.min(options.maxLlm, left), 0);
  return { maxNew, maxLlm, sources: options.sources };
}
