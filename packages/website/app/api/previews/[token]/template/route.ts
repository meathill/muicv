import { isJsonTemplateId, isTemplateLang } from '@muicv/shared';
import { setUserPreviewTemplate } from '@/lib/preview';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

/** POST /api/previews/:token/template  body { template, lang?, accent? } */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: 'invalid-token' }, { status: 400 });
  }
  let payload: { template?: unknown; lang?: unknown; accent?: unknown } = {};
  try {
    payload = (await req.json()) as { template?: unknown; lang?: unknown; accent?: unknown };
  } catch {
    return Response.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (typeof payload.template !== 'string' || !isJsonTemplateId(payload.template)) {
    return Response.json({ error: 'invalid-template' }, { status: 400 });
  }
  const input: { template: string; lang?: 'zh' | 'en'; accent?: string | null } = {
    template: payload.template,
  };
  if (payload.lang !== undefined) {
    if (!isTemplateLang(payload.lang)) {
      return Response.json({ error: 'invalid-lang' }, { status: 400 });
    }
    input.lang = payload.lang;
  }
  if (payload.accent !== undefined) {
    if (payload.accent !== null && typeof payload.accent !== 'string') {
      return Response.json({ error: 'invalid-accent' }, { status: 400 });
    }
    input.accent = payload.accent;
  }
  const ok = await setUserPreviewTemplate(session.user.id, token, input);
  if (!ok) return Response.json({ error: 'not-found-or-not-owner' }, { status: 404 });
  return Response.json({ ok: true, template: input.template });
}
