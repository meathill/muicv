/** 招聘页 HTML 片段 → 够用的 markdown。不追求 CommonMark 完美，求职描述结构简单。 */
export function htmlToMarkdown(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|tr|li|h[1-6]|section|article)>/gi, '\n');
  s = s.replace(/<h[1-3][^>]*>/gi, '\n### ');
  s = s.replace(/<li[^>]*>/gi, '- ');
  s = s.replace(/<(strong|b)[^>]*>/gi, '**');
  s = s.replace(/<\/(strong|b)>/gi, '**');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
    .trim();
}
