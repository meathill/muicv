import type { LedgerType } from '@muicv/shared';
import { displayToMicro, SIGNUP_BONUS } from '@muicv/shared';

/**
 * Token 钱包：原子扣账 / 入账 / 余额查询。
 *
 * **单位约定**：本模块所有 `amount` / `balance` / `lifetimeEarned` / `lifetimeSpent` / `delta`
 * 都是 **μtoken**（1 显示 token = 10_000 μtoken）。调用方传入和读出都是 μ；要展示给用户
 * 时上层用 `microToDisplay` 转回去。
 *
 * 设计要点：
 *   - 扣账走 `UPDATE … WHERE balance >= ? RETURNING balance` 单语句原子，
 *     SQLite 内部有 page-level mutex，无并发双扣风险
 *   - ledger 写失败不影响 balance 已扣的事实（最坏情况丢一条流水）；
 *     lifetimeSpent 字段同步更新，财务对账以余额表为准
 *   - 入账 (credit) 走 `INSERT … ON CONFLICT … DO UPDATE` upsert，行不存在自动建
 *   - ensureBalance 走 `INSERT … ON CONFLICT … DO NOTHING RETURNING`，
 *     RETURNING 只对真新建的行返回，conflict 时返回 null —— 借此判断是否要写 signup_bonus 流水
 *
 * 这份给 packages/api 用，packages/website/lib/wallet.ts 是镜像版本。
 */

const SIGNUP_BONUS_MICRO = displayToMicro(SIGNUP_BONUS);

export type WalletEnv = {
  MUICV_API_DB: D1Database;
};

export type ChargeResult =
  | { ok: true; balance: number }
  | { ok: false; balance: number; reason: 'insufficient_balance' | 'no_user' };

export type CreditMeta = Record<string, unknown>;

/** 读余额；行不存在返回 null（调用方决定是否 ensureBalance）。 */
export async function readBalance(
  env: WalletEnv,
  userId: string,
): Promise<{ balance: number; lifetimeEarned: number; lifetimeSpent: number } | null> {
  return await env.MUICV_API_DB.prepare(
    'SELECT balance, lifetimeEarned, lifetimeSpent FROM tokenBalance WHERE userId = ? LIMIT 1',
  )
    .bind(userId)
    .first<{ balance: number; lifetimeEarned: number; lifetimeSpent: number }>();
}

/**
 * 确保钱包初始化：行不存在就 INSERT signup bonus + 流水一条。
 * 并发安全：INSERT OR IGNORE + RETURNING，conflict 时第二个请求拿到 null，
 * 不会重复发 bonus。
 *
 * 返回：{ balance, justInitialized }
 */
export async function ensureBalance(
  env: WalletEnv,
  userId: string,
  bonus = SIGNUP_BONUS_MICRO,
): Promise<{ balance: number; justInitialized: boolean }> {
  const now = Date.now();
  const inserted = await env.MUICV_API_DB.prepare(
    `INSERT INTO tokenBalance (userId, balance, lifetimeEarned, lifetimeSpent, updatedAt)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(userId) DO NOTHING
     RETURNING balance`,
  )
    .bind(userId, bonus, bonus, now)
    .first<{ balance: number }>();

  if (inserted) {
    // 真新建：补一条 signup_bonus 流水。失败不影响余额，最多丢条流水。
    await env.MUICV_API_DB.prepare(
      `INSERT INTO tokenLedger (id, userId, delta, type, meta, createdAt)
       VALUES (?, ?, ?, 'signup_bonus', NULL, ?)`,
    )
      .bind(crypto.randomUUID(), userId, bonus, now)
      .run()
      .catch(() => {});
    return { balance: inserted.balance, justInitialized: true };
  }

  // 已存在：读现有余额
  const existing = await readBalance(env, userId);
  return { balance: existing?.balance ?? 0, justInitialized: false };
}

/**
 * 原子扣账：UPDATE … WHERE balance >= ? RETURNING balance。
 * 余额不足返回 ok=false（不抛异常），调用方根据 ok 决定是否 402。
 *
 * @param meta 写入 ledger.meta 的 JSON（OpenAI 用量、url 等）
 */
export async function charge(
  env: WalletEnv,
  userId: string,
  amount: number,
  type: LedgerType,
  meta?: CreditMeta,
  ledgerId?: string,
): Promise<ChargeResult> {
  if (amount <= 0) {
    const cur = await readBalance(env, userId);
    return { ok: true, balance: cur?.balance ?? 0 };
  }

  // 幂等：同一 ledgerId 已扣过就不再扣（重试 / 重放安全）
  if (ledgerId) {
    const dup = await env.MUICV_API_DB.prepare('SELECT 1 FROM tokenLedger WHERE id = ? LIMIT 1').bind(ledgerId).first();
    if (dup) {
      const cur = await readBalance(env, userId);
      return { ok: true, balance: cur?.balance ?? 0 };
    }
  }

  const now = Date.now();
  const updated = await env.MUICV_API_DB.prepare(
    `UPDATE tokenBalance
       SET balance = balance - ?,
           lifetimeSpent = lifetimeSpent + ?,
           updatedAt = ?
     WHERE userId = ? AND balance >= ?
     RETURNING balance`,
  )
    .bind(amount, amount, now, userId, amount)
    .first<{ balance: number }>();

  if (!updated) {
    const existing = await readBalance(env, userId);
    if (!existing) return { ok: false, balance: 0, reason: 'no_user' };
    return { ok: false, balance: existing.balance, reason: 'insufficient_balance' };
  }

  await env.MUICV_API_DB.prepare(
    `INSERT INTO tokenLedger (id, userId, delta, type, meta, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(ledgerId ?? crypto.randomUUID(), userId, -amount, type, meta ? JSON.stringify(meta) : null, now)
    .run()
    .catch(() => {});

  return { ok: true, balance: updated.balance };
}

/**
 * 原子入账：INSERT … ON CONFLICT … DO UPDATE。
 *
 * @param ledgerId 用于幂等：webhook 用 invoiceId 派生（如 `inv_xxx`），
 *                 第二次同 id 重发时直接返回 deduped=true 不重复入账
 */
export async function credit(
  env: WalletEnv,
  userId: string,
  amount: number,
  type: LedgerType,
  meta?: CreditMeta,
  ledgerId?: string,
): Promise<{ balance: number; deduped: boolean }> {
  if (amount <= 0) {
    const cur = await readBalance(env, userId);
    return { balance: cur?.balance ?? 0, deduped: false };
  }

  const id = ledgerId ?? crypto.randomUUID();
  const now = Date.now();

  if (ledgerId) {
    const dup = await env.MUICV_API_DB.prepare('SELECT 1 FROM tokenLedger WHERE id = ? LIMIT 1').bind(ledgerId).first();
    if (dup) {
      const cur = await readBalance(env, userId);
      return { balance: cur?.balance ?? 0, deduped: true };
    }
  }

  await env.MUICV_API_DB.batch([
    env.MUICV_API_DB.prepare(
      `INSERT INTO tokenBalance (userId, balance, lifetimeEarned, lifetimeSpent, updatedAt)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(userId) DO UPDATE SET
         balance = balance + excluded.balance,
         lifetimeEarned = lifetimeEarned + excluded.lifetimeEarned,
         updatedAt = excluded.updatedAt`,
    ).bind(userId, amount, amount, now),
    env.MUICV_API_DB.prepare(
      `INSERT INTO tokenLedger (id, userId, delta, type, meta, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, userId, amount, type, meta ? JSON.stringify(meta) : null, now),
  ]);

  const cur = await readBalance(env, userId);
  return { balance: cur?.balance ?? 0, deduped: false };
}
