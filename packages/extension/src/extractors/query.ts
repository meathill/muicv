/** 抽取器面对的最小 DOM 读口，content script 用 document，单测用假对象。 */
export type QueryRoot = {
  url: string;
  pageTitle: string;
  text(selectors: string): string | null;
  html(selectors: string): string | null;
  jsonLd(): unknown[];
};

export function fromDocument(document: Document, url: string): QueryRoot {
  function pick(selectors: string, html: boolean): string | null {
    for (const raw of selectors.split(',')) {
      const el = document.querySelector(raw.trim());
      if (!el) continue;
      const value = html ? el.innerHTML : el.textContent;
      const trimmed = value?.replace(/\s+/g, ' ').trim();
      if (trimmed) return html ? el.innerHTML.trim() : trimmed;
    }
    return null;
  }

  return {
    url,
    pageTitle: document.title,
    text: (selectors) => pick(selectors, false),
    html: (selectors) => pick(selectors, true),
    jsonLd() {
      const out: unknown[] = [];
      for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
        const raw = node.textContent?.trim();
        if (!raw) continue;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) out.push(...parsed);
          else out.push(parsed);
        } catch {
          /* 站点经常塞非法 JSON-LD，忽略 */
        }
      }
      return out;
    },
  };
}
