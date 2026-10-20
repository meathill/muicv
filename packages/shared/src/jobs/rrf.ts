/**
 * Reciprocal Rank Fusion：score(d) = Σ 1 / (k + rank_i(d))，rank 从 1 开始。
 * 只依赖名次，不需要把 bm25 与 cosine 归一到同一量纲——这是混合检索最稳的融合法。
 */
export const RRF_K = 60;

export function reciprocalRankFusion(lists: string[][], k = RRF_K): Array<{ id: string; score: number }> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return [...scores.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}
