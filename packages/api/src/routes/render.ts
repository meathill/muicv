import {
  assertTemplateResumeData,
  displayToMicro,
  insufficientBalanceError,
  isJsonTemplateId,
  isTemplateLang,
  PDF_RENDER_COST,
  type TemplateLang,
  type TemplateResumeData,
} from '@muicv/shared';
import type { Context } from 'hono';

import { toErrorMessage } from '../lib/error-message.ts';
import { readJsonBody } from '../lib/json-body.ts';
import { type RenderPdfInput, renderPdf } from '../lib/render-pdf.ts';
import { charge, ensureBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/**
 * POST /render —— 写一次性 token 进 MUICV_KV，puppeteer.goto packages/website 的
 * /r/render/[token]，等字体加载完，page.pdf 出 A4。详见 src/lib/render-pdf.ts。
 *
 * 两种 payload 形态（互斥）：
 *   - markdown 路径（向下兼容，老 skill）：`{ markdown: string, template?: 'default' }`
 *   - JSON 路径（新模板）：`{ resumeJson: TemplateResumeData, template: 't1-classic'..'t6-academic', lang?: 'zh'|'en' }`
 *
 * 响应：200 application/pdf + PDF bytes / 402 余额不足 / 502 渲染异常。
 *
 * 计费：成功才扣 PDF_RENDER_COST tokens；渲染失败 502 但不扣账（避免反复重试被反复扣）。
 */
export async function handleRender(c: Context<AppEnv>): Promise<Response> {
  const parsed = await readJsonBody<Record<string, unknown>>(c);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.body;

  let renderInput: RenderPdfInput;
  let templateForLog: string;

  if (payload.resumeJson != null) {
    if (typeof payload.template !== 'string' || !isJsonTemplateId(payload.template)) {
      return c.json(
        {
          error:
            'JSON 路径下 `template` 必填且必须是 t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic 之一',
        },
        400,
      );
    }
    try {
      assertTemplateResumeData(payload.resumeJson);
    } catch (error) {
      return c.json(
        {
          error: 'resumeJson 不符合 TemplateResumeData schema',
          detail: toErrorMessage(error),
        },
        400,
      );
    }
    const lang: TemplateLang = isTemplateLang(payload.lang) ? payload.lang : 'zh';
    templateForLog = payload.template;
    renderInput = {
      kind: 'json',
      resume: payload.resumeJson as TemplateResumeData,
      template: payload.template,
      lang,
      ...(typeof payload.accent === 'string' ? { accent: payload.accent } : {}),
    };
  } else {
    if (typeof payload.markdown !== 'string' || payload.markdown.trim().length === 0) {
      return c.json({ error: '字段 `markdown` 必须是非空字符串（或改用 `resumeJson`）' }, 400);
    }
    const template = typeof payload.template === 'string' ? payload.template : 'default';
    templateForLog = template;
    renderInput = { kind: 'markdown', markdown: payload.markdown, template };
  }

  const userId = c.get('userId') as string;
  const pdfCostMicro = displayToMicro(PDF_RENDER_COST);
  const wallet = await ensureBalance(c.env, userId);
  if (wallet.balance < pdfCostMicro) {
    return c.json(insufficientBalanceError(wallet.balance), 402);
  }

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(renderInput, c.env);
  } catch (error) {
    return c.json(
      {
        error: 'PDF 渲染失败',
        detail: toErrorMessage(error),
      },
      502,
    );
  }

  c.executionCtx.waitUntil(
    charge(c.env, userId, pdfCostMicro, 'pdf_render', { template: templateForLog }).catch(() => {}),
  );

  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="resume.pdf"',
    },
  });
}
