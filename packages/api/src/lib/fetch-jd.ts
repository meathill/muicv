import puppeteer, { type BrowserWorker } from '@cloudflare/puppeteer';
import readabilityJs from '@mozilla/readability/Readability.js';
import turndownJs from 'turndown/dist/turndown.js';

// page.evaluate 的回调在浏览器里跑，需要 DOM 全局 + addScriptTag 注入的库。
// Worker tsconfig 不含 DOM lib，所以这里给一个最小的 file-scoped 类型声明，
// 只覆盖回调里实际用到的成员，避免在整个项目里启用 DOM lib 把 Worker 代码污染。
type ParsedArticle = {
  title: string | null;
  content: string | null;
  textContent: string | null;
  length: number;
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
};
declare const document: {
  querySelector(selector: string): { content?: string } | null;
  cloneNode(deep: boolean): unknown;
  readonly title: string;
};
declare const window: { readonly location: { readonly href: string } };
declare const Readability: new (doc: unknown) => { parse(): ParsedArticle | null };
declare const TurndownService: new (
  opts?: Record<string, unknown>,
) => {
  turndown(html: string): string;
};

export type FetchJdInput = {
  url: string;
};

export type FetchJdEnv = {
  BROWSER: BrowserWorker;
};

export type FetchedJd = {
  markdown: string;
  meta: {
    title: string | null;
    company: string | null;
    source_url: string;
    fetched_at: string;
    description: string | null;
  };
};

/**
 * 抓 JD URL 转 Readability 主内容 + turndown 转 markdown 时遇到的可预期失败。
 * caller 拿到这个错误就直接 502 透传 detail。
 */
export class FetchJdError extends Error {
  readonly status = 502 as const;
  readonly detail: { error: string; url: string; [k: string]: unknown };
  constructor(detail: { error: string; url: string; [k: string]: unknown }) {
    super(detail.error);
    this.detail = detail;
  }
}

const NAVIGATION_TIMEOUT_MS = 20_000;
/** Readability 提取出的正文若少于此长度，认为页面没拿到真内容（登录墙 / SPA 失败 / 反爬）。 */
const MIN_CONTENT_LENGTH = 120;

/**
 * 抓 JD URL → 清洗后的 markdown + meta。
 *
 * 实现：
 *   1. puppeteer.goto(url, networkidle2)
 *   2. addScriptTag 把 @mozilla/readability 和 turndown 注入页面
 *   3. page.evaluate 里跑 Readability 抽主内容 + turndown 转 markdown，结果返回 Worker
 *
 * 之所以让 turndown 也在 page 内跑：Worker runtime（即使开 nodejs_compat）没有 DOM，
 * turndown 依赖 DOMParser 等接口，必须在 page 上下文执行。
 *
 * 限制（沿用之前 container 实现）：
 *   - 不绕过登录墙
 *   - 不对抗 Cloudflare Turnstile / Captcha
 *   - 不伪装 UA 规避 ToS
 */
export async function fetchJd(input: FetchJdInput, env: FetchJdEnv): Promise<FetchedJd> {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

    // 必须在 goto 之前用 evaluateOnNewDocument 注入。
    // 之前用 page.addScriptTag({ content }) 在 goto 之后注入，会被目标页严格 CSP
    // 拦掉 inline <script>，导致 evaluate 时 Readability / TurndownService 未定义。
    // evaluateOnNewDocument 走 CDP Page.addScriptToEvaluateOnNewDocument，
    // 由调试通道注入，不走目标页 CSP。
    await page.evaluateOnNewDocument(readabilityJs);
    await page.evaluateOnNewDocument(turndownJs);

    const response = await page.goto(input.url, {
      waitUntil: 'networkidle2',
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    if (!response?.ok()) {
      throw new FetchJdError({
        error: '目标页面返回非 200',
        url: input.url,
        status: response?.status() ?? null,
      });
    }

    const extracted = await page.evaluate(() => {
      function getMeta(name: string): string | null {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el?.content?.trim() || null;
      }

      // Readability 会修改 document，先 clone
      const reader = new Readability(document.cloneNode(true));
      const article = reader.parse();

      let markdown = '';
      if (article?.content) {
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          bulletListMarker: '-',
          emDelimiter: '*',
        });
        markdown = turndownService.turndown(article.content).trim();
      }

      return {
        title: article?.title ?? document.title ?? null,
        contentHtml: article?.content ?? null,
        textLength: article?.length ?? 0,
        siteName: article?.siteName ?? getMeta('og:site_name'),
        ogTitle: getMeta('og:title'),
        description: getMeta('description') ?? getMeta('og:description'),
        url: window.location.href,
        markdown,
      };
    });

    if (!extracted.contentHtml || extracted.textLength < MIN_CONTENT_LENGTH || !extracted.markdown) {
      throw new FetchJdError({
        error: '未能从页面提取到足够内容（少于 120 字）。可能是登录墙或 SPA 渲染失败。',
        url: input.url,
        title: extracted.title,
      });
    }

    return {
      markdown: extracted.markdown,
      meta: {
        title: extracted.title,
        company: extracted.siteName,
        source_url: extracted.url,
        fetched_at: new Date().toISOString(),
        description: extracted.description,
      },
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
