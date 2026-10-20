/**
 * D1 FTS5（trigram tokenizer）查询构造。
 *
 * trigram 对中英文都按 3 字符切片：任意 ≥3 字符子串可命中（模糊 / 拼写容错靠 trigram 重叠 + bm25 排序）。
 * 把每个词拆成 trigram 用 OR 连起来，拼错一两个字母的词仍能共享大部分 trigram 而命中。
 * < 3 字符的词（「前端」「Go」）trigram 无法匹配，单独返回给调用方走 LIKE。
 */

export type FtsPlan = {
  /** FTS5 MATCH 表达式；为空表示没有可用 trigram */
  match: string;
  /** 需要 LIKE 兜底的短词 */
  shortTerms: string[];
};

const MAX_TRIGRAMS = 48;

function quote(term: string): string {
  return `"${term.replace(/"/g, '""')}"`;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

export function buildFtsPlan(text: string): FtsPlan {
  const grams = new Set<string>();
  const shortTerms = new Set<string>();
  for (const token of tokenize(text)) {
    const chars = [...token];
    if (chars.length < 3) {
      shortTerms.add(token);
      continue;
    }
    for (let i = 0; i + 3 <= chars.length; i++) grams.add(chars.slice(i, i + 3).join(''));
  }
  const list = [...grams].slice(0, MAX_TRIGRAMS);
  return { match: list.map(quote).join(' OR '), shortTerms: [...shortTerms].slice(0, 8) };
}
