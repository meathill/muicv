import { Marked } from 'marked';

/**
 * 文章/Skill 内容专用的 marked 实例：
 * 1. 标题层级地板 h2 —— 页面外壳已经有 h1（文章标题），markdown 里写 `#` 会撞 h1
 *    触发 Lighthouse 第二个 h1 + sequentially-descending 双重违规。
 *    现 CMS 内容统一从 `##` 起算，直接保留原层级，只把 `#`（如果有）兜底到 h2。
 *    不再 `depth + 1` —— 之前会把 ## 推到 h3，制造 h1→h3 跳级。
 * 2. 给标题加 id，方便深链。
 *
 * 用 `new Marked()` 而不是 `marked.use(...)`，避免模块级单例被多次扩展。
 */
const marked = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const clamped = Math.min(Math.max(depth, 2), 6);
      const text = this.parser.parseInline(tokens);
      const slug = text
        .replace(/<[^>]+>/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-鿿-]/g, '');
      const id = slug ? ` id="${slug}"` : '';
      return `<h${clamped}${id}>${text}</h${clamped}>\n`;
    },
  },
});

export function MarkdownBody({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string;

  return (
    <div
      className="prose-mui max-w-none text-[16px] leading-[1.8] text-ink-soft"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: marked 输出，CMS 内容是受信任的
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
