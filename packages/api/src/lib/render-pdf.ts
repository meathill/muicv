import puppeteer, { type BrowserWorker } from '@cloudflare/puppeteer';

import type { TemplateLang, TemplateResumeData } from '@muicv/shared';

export type RenderPdfMarkdownInput = {
  kind: 'markdown';
  markdown: string;
  template: string;
};

export type RenderPdfJsonInput = {
  kind: 'json';
  resume: TemplateResumeData;
  template: string;
  lang: TemplateLang;
  accent?: string;
};

export type RenderPdfInput = RenderPdfMarkdownInput | RenderPdfJsonInput;

export type RenderPdfEnv = {
  BROWSER: BrowserWorker;
  MUICV_KV: KVNamespace;
  RENDER_BASE_URL: string;
};

const KV_KEY_PREFIX = 'resume:';
/** 一次性 token 在 KV 的存活时长。puppeteer.goto 之后立即 delete，TTL 是兜底。 */
const TOKEN_TTL_SECONDS = 300;
const NAVIGATION_TIMEOUT_MS = 20_000;

/**
 * 简历 → PDF。markdown / json 两种 payload 都支持：
 *   - markdown：写 KV 后由 packages/website /r/render/[token] 走 marked → default 模板
 *   - json：写 KV 后由 /r/render/[token] 选 t1~t6 模板渲染
 *
 * 输出 margin 跟 payload 模板有关：
 *   - default：保留 14mm 边距（与旧版兼容）
 *   - t1~t6：模板自带 padding 已经把 A4 内边距处理好，puppeteer margin 设 0
 */
export async function renderPdf(input: RenderPdfInput, env: RenderPdfEnv): Promise<Uint8Array> {
  const token = crypto.randomUUID();
  const kvKey = `${KV_KEY_PREFIX}${token}`;
  const url = `${env.RENDER_BASE_URL}/r/render/${token}`;

  const stored =
    input.kind === 'json'
      ? {
          kind: 'json' as const,
          resume: input.resume,
          template: input.template,
          lang: input.lang,
          ...(input.accent ? { accent: input.accent } : {}),
        }
      : { kind: 'markdown' as const, markdown: input.markdown, template: input.template };

  await env.MUICV_KV.put(kvKey, JSON.stringify(stored), {
    expirationTtl: TOKEN_TTL_SECONDS,
  });

  const isJsonTemplate = input.kind === 'json';
  const margin = isJsonTemplate
    ? { top: '0', bottom: '0', left: '0', right: '0' }
    : { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' };

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: NAVIGATION_TIMEOUT_MS });
    await page.evaluateHandle('document.fonts.ready');
    if (isJsonTemplate) {
      // 等 FitToPage 测量并施加 zoom 后再出 PDF，否则截到排版前的页面。
      // 表达式字符串形式：worker 环境 tsconfig 没有 DOM lib。
      // 超时 / 脚本异常不阻塞出 PDF（页面按 zoom=1 渲染）。
      await page
        .waitForFunction("document.documentElement.dataset['fitDone'] === '1'", {
          timeout: 10_000,
          polling: 'raf',
        })
        .catch(() => {});
    }
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin,
      preferCSSPageSize: isJsonTemplate,
    });
    return pdf;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    await env.MUICV_KV.delete(kvKey).catch(() => {});
  }
}
