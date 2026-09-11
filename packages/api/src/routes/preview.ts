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
import {
  createPreview,
  extendPreview,
  getPreview,
  incrementPdfCredit,
  isPreviewActive,
  isPreviewShareMode,
  isPreviewTtlDays,
  listPreviewsByUser,
  PREVIEW_SHARE_MODES,
  PREVIEW_TTL_DAYS_OPTIONS,
  type PreviewRecord,
  type PreviewShareMode,
  type PreviewTtlDays,
  revokePreview,
  setPreviewShareMode,
  setPreviewTemplate,
} from '../lib/preview-store.ts';
import { renderPdf } from '../lib/render-pdf.ts';
import { charge, ensureBalance } from '../lib/wallet.ts';
import type { AppEnv } from '../middleware/api-key.ts';

/** UUID v4：8-4-4-4-12 = 36 位含连字符。 */
const TOKEN_RE = /^[0-9a-f-]{36}$/i;

function publicPreviewUrl(env: CloudflareBindings, token: string): string {
  const base = env.PREVIEW_PUBLIC_BASE_URL || 'https://muicv.com';
  return `${base.replace(/\/$/, '')}/preview/${token}`;
}

/**
 * POST /preview
 *
 * Body: {
 *   resumeJson: TemplateResumeData,
 *   template: 't1-classic'..'t6-academic',
 *   lang?: 'zh' | 'en',
 *   accent?: string,
 *   shareMode?: 'link' | 'public',  // 默认 link
 *   ttlDays?: 1 | 7 | 30,           // 默认 7
 * }
 *
 * 响应：201 + { token, url, expiresAt, shareMode }；400 / 401。
 *
 * 计费：创建免费（只是写一行 D1）。下载 PDF 时 owner 第一次扣 PDF_RENDER_COST，
 *      之后访客复用同一份缓存的 D1 记录免扣（防 token 公开后被刷爆余额）。
 */
export async function handlePreviewCreate(c: Context<AppEnv>): Promise<Response> {
  const parsed = await readJsonBody<Record<string, unknown>>(c);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.body;

  if (typeof payload.template !== 'string' || !isJsonTemplateId(payload.template)) {
    return c.json(
      {
        error: '`template` 必须是 t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic 之一',
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
  const shareMode: PreviewShareMode = isPreviewShareMode(payload.shareMode) ? payload.shareMode : 'link';
  const ttlDays: PreviewTtlDays = isPreviewTtlDays(payload.ttlDays) ? payload.ttlDays : 7;

  const userId = c.get('userId') as string;
  const record = await createPreview(c.env, {
    userId,
    resume: payload.resumeJson as TemplateResumeData,
    template: payload.template,
    lang,
    ...(typeof payload.accent === 'string' ? { accent: payload.accent } : {}),
    shareMode,
    ttlDays,
  });

  return c.json(
    {
      token: record.token,
      url: publicPreviewUrl(c.env, record.token),
      template: record.template,
      lang: record.lang,
      shareMode: record.shareMode,
      expiresAt: record.expiresAt,
      shareModes: PREVIEW_SHARE_MODES,
      ttlDaysOptions: PREVIEW_TTL_DAYS_OPTIONS,
    },
    201,
  );
}

/**
 * GET /preview/:token  —— 公开端点。
 *
 * 返回 JSON 给前端（website preview page SSR 也是从这里拿数据）。
 * 公开访客只能看到 share-relevant 字段（resume 内容、template、lang、过期时间），
 * 不返回 userId / pdfCredit 等内部字段。
 */
export async function handlePreviewGet(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) {
    return c.json({ error: 'token 不合法' }, 400);
  }
  const record = await getPreview(c.env, token);
  if (!record) return c.json({ error: 'not-found' }, 404);
  if (!isPreviewActive(record)) {
    return c.json(
      {
        error: record.revokedAt ? 'revoked' : 'expired',
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
      },
      410,
    );
  }
  return c.json({
    token: record.token,
    template: record.template,
    lang: record.lang,
    accent: record.accent,
    resume: record.resume,
    shareMode: record.shareMode,
    expiresAt: record.expiresAt,
    canDownloadPdf: record.pdfCredit > 0,
  });
}

/**
 * POST /preview/:token/pdf —— 下载预览页对应的 PDF。
 *
 * 任何拿到 token 的人都能点击下载；每次渲染都向 owner 余额扣 PDF_RENDER_COST。
 * 设计意图：token 本身就是 owner 颁发的访问凭证，他承担费用；防滥用靠 revoke
 * / extend 控制 token 生命周期，而不是在 UI 上劝退访客。
 *
 * - 已 revoke 或过期 → 410
 * - owner 余额不足 → 402（错误展示给点击的人，提示由 owner 联系）
 */
export async function handlePreviewPdf(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) {
    return c.json({ error: 'token 不合法' }, 400);
  }
  const record = await getPreview(c.env, token);
  if (!record) return c.json({ error: 'not-found' }, 404);
  if (!isPreviewActive(record)) return c.json({ error: record.revokedAt ? 'revoked' : 'expired' }, 410);

  const pdfCostMicro = displayToMicro(PDF_RENDER_COST);
  const wallet = await ensureBalance(c.env, record.userId);
  if (wallet.balance < pdfCostMicro) {
    return c.json(insufficientBalanceError(wallet.balance), 402);
  }

  let pdf: Uint8Array;
  try {
    pdf = await renderPdf(
      {
        kind: 'json',
        resume: record.resume,
        template: record.template,
        lang: record.lang,
        ...(record.accent ? { accent: record.accent } : {}),
      },
      c.env,
    );
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
    Promise.all([
      charge(c.env, record.userId, pdfCostMicro, 'pdf_render', { template: record.template, via: 'preview' }),
      incrementPdfCredit(c.env, record.token),
    ]).catch(() => {}),
  );

  return new Response(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="resume-${record.token.slice(0, 8)}.pdf"`,
    },
  });
}

/** POST /preview/:token/revoke —— 仅 owner，软删（revokedAt = now）。 */
export async function handlePreviewRevoke(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) return c.json({ error: 'token 不合法' }, 400);
  const userId = c.get('userId') as string;
  const ok = await revokePreview(c.env, token, userId);
  if (!ok) return c.json({ error: 'not-found-or-not-owner' }, 404);
  return c.json({ ok: true });
}

/** POST /preview/:token/extend —— 仅 owner，按 ttlDays 续期 + 取消 revoke。 */
export async function handlePreviewExtend(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) return c.json({ error: 'token 不合法' }, 400);
  const contentType = c.req.header('content-type') ?? '';
  let payload: { ttlDays?: unknown } = {};
  if (contentType.includes('application/json')) {
    try {
      payload = (await c.req.json()) as { ttlDays?: unknown };
    } catch {
      return c.json({ error: '请求体不是合法 JSON' }, 400);
    }
  }
  const ttlDays: PreviewTtlDays = isPreviewTtlDays(payload.ttlDays) ? payload.ttlDays : 7;
  const userId = c.get('userId') as string;
  const newExpiresAt = await extendPreview(c.env, token, userId, ttlDays);
  if (newExpiresAt == null) return c.json({ error: 'not-found-or-not-owner' }, 404);
  return c.json({ ok: true, expiresAt: newExpiresAt });
}

/** GET /preview —— 列当前登录用户的预览列表（dashboard 用）。 */
export async function handlePreviewList(c: Context<AppEnv>): Promise<Response> {
  const userId = c.get('userId') as string;
  const rawLimit = Number.parseInt(c.req.query('limit') ?? '', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const items = await listPreviewsByUser(c.env, userId, limit);
  const base = c.env.PREVIEW_PUBLIC_BASE_URL || 'https://muicv.com';
  return c.json({
    items: items.map((it) => ({
      ...it,
      url: `${base.replace(/\/$/, '')}/preview/${it.token}`,
      status: it.revokedAt != null ? 'revoked' : it.expiresAt <= Date.now() ? 'expired' : 'active',
    })),
  });
}

/**
 * POST /preview/:token/template —— 仅 owner，切模板（可选同时改 lang / accent）。
 *
 * body: { template: 't1-classic'..'t6-academic', lang?: 'zh'|'en', accent?: string | null }
 * 不扣费——只是改 D1 字段，PDF 渲染才扣费。
 */
export async function handlePreviewTemplate(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) return c.json({ error: 'token 不合法' }, 400);
  const parsed = await readJsonBody<{ template?: unknown; lang?: unknown; accent?: unknown }>(c);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.body;
  if (typeof payload.template !== 'string' || !isJsonTemplateId(payload.template)) {
    return c.json(
      {
        error: '`template` 必须是 t1-classic / t2-minimal / t3-sidebar / t4-tech / t5-timeline / t6-academic 之一',
      },
      400,
    );
  }
  const input: { template: string; lang?: TemplateLang; accent?: string | null } = {
    template: payload.template,
  };
  if (payload.lang !== undefined) {
    if (!isTemplateLang(payload.lang)) {
      return c.json({ error: '`lang` 必须是 "zh" 或 "en"' }, 400);
    }
    input.lang = payload.lang;
  }
  if (payload.accent !== undefined) {
    if (payload.accent !== null && typeof payload.accent !== 'string') {
      return c.json({ error: '`accent` 必须是 string 或 null' }, 400);
    }
    input.accent = payload.accent;
  }
  const userId = c.get('userId') as string;
  const ok = await setPreviewTemplate(c.env, token, userId, input);
  if (!ok) return c.json({ error: 'not-found-or-not-owner' }, 404);
  return c.json({ ok: true, template: input.template });
}

/** POST /preview/:token/share-mode —— 仅 owner，切换 link / public。 */
export async function handlePreviewShareMode(c: Context<AppEnv>): Promise<Response> {
  const token = c.req.param('token');
  if (!token || !TOKEN_RE.test(token)) return c.json({ error: 'token 不合法' }, 400);
  const parsed = await readJsonBody<{ shareMode?: unknown }>(c);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.body;
  if (!isPreviewShareMode(payload.shareMode)) {
    return c.json({ error: 'shareMode 必须是 "link" 或 "public"' }, 400);
  }
  const userId = c.get('userId') as string;
  const ok = await setPreviewShareMode(c.env, token, userId, payload.shareMode);
  if (!ok) return c.json({ error: 'not-found-or-not-owner' }, 404);
  return c.json({ ok: true, shareMode: payload.shareMode });
}

export type { PreviewRecord };
