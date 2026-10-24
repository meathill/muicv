import type { Context, MiddlewareHandler } from 'hono';

export type AppEnv = {
  Bindings: CloudflareBindings;
  Variables: {
    userId?: string;
    keyId?: string;
  };
};

const KEY_PATTERN = /^mui_[A-Za-z0-9]{32}$/;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 校验 Authorization header，set userId / keyId 进 context；
 * 失败返回 Response，调用方应该立刻 return。
 *
 * 数据源：MUICV_API_DB 是和 packages/website 共用的 muicv D1。apiKey 表
 * schema 由 website migrations/0003_api_keys.sql 创建。
 */
async function verifyKey(c: Context<AppEnv>, authHeader: string): Promise<Response | undefined> {
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  if (!match) {
    return c.json({ error: 'authorization 必须是 "Bearer <key>" 格式' }, 401);
  }
  const key = match[1] ?? '';
  if (!KEY_PATTERN.test(key)) {
    return c.json({ error: 'api key 格式不合法（应该是 mui_ 开头 36 字符）' }, 401);
  }

  const hash = await sha256Hex(key);
  const row = await c.env.MUICV_API_DB.prepare('SELECT id, userId, revokedAt FROM apiKey WHERE keyHash = ? LIMIT 1')
    .bind(hash)
    .first<{ id: string; userId: string; revokedAt: number | null }>();

  if (!row || row.revokedAt) {
    return c.json({ error: 'api key 无效或已被撤销' }, 401);
  }

  c.set('keyId', row.id);
  c.set('userId', row.userId);

  // 异步更新 lastUsedAt（不 block 请求；失败也不影响业务）
  c.executionCtx.waitUntil(
    c.env.MUICV_API_DB.prepare('UPDATE apiKey SET lastUsedAt = ? WHERE id = ?')
      .bind(Date.now(), row.id)
      .run()
      .catch(() => {}),
  );
}

/** 必须带合法 Bearer key 验证。失败统一 401。用于 /llm/*、未来收费端点。 */
export const requireApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('authorization');
  if (!auth) {
    return c.json({ error: 'missing-api-key', message: '需要 mui_ API key（在 muicv.com/dashboard 生成）' }, 401);
  }
  const r = await verifyKey(c, auth);
  if (r instanceof Response) return r;
  await next();
};

/**
 * 可选 Bearer key 验证。
 *
 * 不带 Authorization → 直接放行（走 Cloudflare 层 IP 速率限制）
 * 带了但格式错 / key 不存在 / 已撤销 → 401
 * 带了合法 key → set userId / keyId 进 context，异步更新 lastUsedAt 后放行
 */
export const optionalApiKey: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header('authorization');
  if (!auth) {
    await next();
    return;
  }
  const r = await verifyKey(c, auth);
  if (r instanceof Response) return r;
  await next();
};
