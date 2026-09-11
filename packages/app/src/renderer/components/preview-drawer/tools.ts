import {
  assertTemplateResumeData,
  isJsonTemplateId,
  type JSON_TEMPLATE_IDS,
  type TemplateResumeData,
} from '@muicv/shared';

export type JsonTemplateId = (typeof JSON_TEMPLATE_IDS)[number];

/**
 * 把 .resume.json 文本解析成 `{ resume, lang }`，供"在线预览 / 更换模板"按钮统一复用。
 * lang 取 JSON 顶层 `_lang` / `lang` 字段，缺省 `zh`；JSON 解析失败 / schema 不符返回 error。
 */
export function parseResumeJsonForPreview(
  content: string,
): { ok: true; resume: TemplateResumeData; lang: 'zh' | 'en' } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    return { ok: false, error: `JSON 解析失败：${err instanceof Error ? err.message : String(err)}` };
  }
  try {
    assertTemplateResumeData(parsed);
  } catch (err) {
    return {
      ok: false,
      error: `不符合 TemplateResumeData schema：${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const ext = parsed as { _lang?: unknown; lang?: unknown };
  const rawLang = typeof ext._lang === 'string' ? ext._lang : ext.lang;
  const lang: 'zh' | 'en' = rawLang === 'en' ? 'en' : 'zh';
  return { ok: true, resume: parsed, lang };
}

/** 与 packages/website /r/render/[token]/templates/registry.ts 注册的 jsonTemplates 一一对应。 */
export const TEMPLATE_LABELS: Record<JsonTemplateId, string> = {
  't1-classic': 't1 · 经典衬线',
  't2-minimal': 't2 · 极简瑞士',
  't3-sidebar': 't3 · 左暗色栏',
  't4-tech': 't4 · 技术向',
  't5-timeline': 't5 · 时间线',
  't6-academic': 't6 · 学术风',
};

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function readTemplateFromJson(content: string | null): JsonTemplateId | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { _template?: unknown; template?: unknown };
    const raw = typeof parsed._template === 'string' ? parsed._template : parsed.template;
    return typeof raw === 'string' && isJsonTemplateId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function readPhotoUrlFromJson(content: string | null): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { photoUrl?: unknown };
    return typeof parsed.photoUrl === 'string' && parsed.photoUrl.length > 0 ? parsed.photoUrl : null;
  } catch {
    return null;
  }
}

/**
 * patch `.resume.json` 的 photoUrl 字段。JSON parse + re-stringify with 2-space indent，
 * 写完返回新文件内容（调用方 setContent 直接 refresh，不必再 fs.read）。
 * 失败返回 null + reason，UI 显示给用户。
 */
export async function patchPhotoUrlInResumeJson(
  path: string,
  oldContent: string,
  photoUrl: string,
): Promise<{ ok: true; newContent: string } | { ok: false; reason: string }> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(oldContent) as Record<string, unknown>;
  } catch (err) {
    return { ok: false, reason: `简历 JSON 解析失败：${err instanceof Error ? err.message : String(err)}` };
  }
  parsed.photoUrl = photoUrl;
  const newContent = `${JSON.stringify(parsed, null, 2)}\n`;
  const res = await window.muicv.fs.write(path, newContent);
  if (!res.ok) {
    return { ok: false, reason: `写回失败：${res.error}` };
  }
  return { ok: true, newContent };
}
