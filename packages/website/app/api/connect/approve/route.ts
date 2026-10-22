import { and, eq, isNull } from 'drizzle-orm';

import { generateApiKey, hashApiKey, previewApiKey } from '@/lib/api-key';
import { buildConnectRedirect, connectTarget } from '@/lib/connect-redirect';
import { getDb, schema } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/connect/approve
 *
 * Body: { state: string; redirect: string; name?: string }
 *
 * 已登录 user 点"授权"会调这个，server 生成一个 mui_ key 并写 apiKey 表，返回
 *   { redirectUrl: "muicv://callback?state=xxx&key=mui_xxx", key }
 *
 * client 拿到后用 location.href 唤起 desktop app。
 *
 * 安全：
 *   - 必须有 better-auth session（getCurrentSession()）
 *   - state 长度限制 8-128
 *   - redirect 只能是 muicv://（桌面端）或浏览器扩展 identity 回跳域名（见 lib/connect-redirect）
 *   - 扩展重新登录时，同名的旧扩展 key 会被吊销，避免越积越多
 *   - 单用户最多 10 个 active key（和 /api/keys 共享配额）
 */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { state?: unknown; redirect?: unknown; name?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid-body' }, { status: 400 });
  }

  const state = typeof body.state === 'string' ? body.state.trim() : '';
  const redirectRaw = typeof body.redirect === 'string' ? body.redirect : 'muicv://callback';

  if (!state || state.length < 8 || state.length > 128) {
    return Response.json({ error: 'invalid-state' }, { status: 400 });
  }
  const target = connectTarget(redirectRaw);
  if (!target) {
    return Response.json({ error: 'invalid-redirect' }, { status: 400 });
  }

  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const fallbackName = target === 'extension' ? '浏览器扩展 Mui简历' : '桌面端 Mui简历';
  const name = rawName.length > 0 && rawName.length <= 64 ? rawName : fallbackName;

  const db = await getDb();

  if (target === 'extension') {
    await db
      .update(schema.apiKey)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(schema.apiKey.userId, session.user.id), eq(schema.apiKey.name, name), isNull(schema.apiKey.revokedAt)),
      );
  }

  // 单用户最多 10 个 active key
  const activeRows = await db
    .select({ id: schema.apiKey.id })
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.userId, session.user.id), isNull(schema.apiKey.revokedAt)));
  if (activeRows.length >= 10) {
    return Response.json(
      { error: 'too-many-keys', detail: '这个账号连接过太多设备，请先在网页端移除旧的桌面端连接。' },
      { status: 400 },
    );
  }

  const key = generateApiKey();
  const keyHash = await hashApiKey(key);
  const keyPreview = previewApiKey(key);
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(schema.apiKey).values({
    id,
    userId: session.user.id,
    name,
    keyHash,
    keyPreview,
    createdAt: now,
  });

  const redirectUrl = buildConnectRedirect(redirectRaw, state, key);

  return Response.json({ redirectUrl, key, keyPreview });
}
