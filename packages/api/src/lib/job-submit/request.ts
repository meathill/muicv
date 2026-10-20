import {
  isOneOf,
  JOB_SUBMIT_MAX_JSONLD,
  JOB_SUBMIT_MAX_LINKS,
  JOB_SUBMIT_MAX_MARKDOWN,
  JOB_SUBMIT_VISIBILITIES,
  type JobSubmitRequest,
} from '@muicv/shared';

/** 校验 POST /jobs/submit 请求体。只接受扩展抽好的结构化内容，不收整页 HTML。 */
export function parseSubmitRequest(
  body: Record<string, unknown>,
): { ok: true; value: JobSubmitRequest } | { ok: false; error: string } {
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!/^https?:\/\//i.test(url) || url.length > 2000) return { ok: false, error: '字段 `url` 必须是 http/https 链接' };
  try {
    new URL(url);
  } catch {
    return { ok: false, error: '字段 `url` 不是合法链接' };
  }
  const markdown = typeof body.markdown === 'string' ? body.markdown.trim() : '';
  if (markdown.length > JOB_SUBMIT_MAX_MARKDOWN) {
    return { ok: false, error: `正文太长（上限 ${JOB_SUBMIT_MAX_MARKDOWN} 字符），请更新扩展` };
  }
  const visibility = isOneOf(JOB_SUBMIT_VISIBILITIES, body.visibility) ? body.visibility : 'public';
  const jsonLd = Array.isArray(body.jsonLd) ? body.jsonLd.slice(0, JOB_SUBMIT_MAX_JSONLD) : [];
  if (!markdown && jsonLd.length === 0) return { ok: false, error: '页面没有可提交的正文' };
  const links = (Array.isArray(body.links) ? body.links : [])
    .flatMap((l) => {
      const o = typeof l === 'object' && l !== null ? (l as Record<string, unknown>) : {};
      const href = typeof o.url === 'string' ? o.url.trim() : '';
      if (!/^https?:\/\//i.test(href) || href.length > 2000) return [];
      return [{ url: href, text: typeof o.text === 'string' ? o.text.trim().slice(0, 200) : '' }];
    })
    .slice(0, JOB_SUBMIT_MAX_LINKS);
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 300) : '';
  return { ok: true, value: { url, title, markdown, jsonLd, links, visibility } };
}
