import {
  JD_CONTRIBUTE_DAILY_CAP,
  type JobSubmitVisibility,
  type SubmitSettlement,
  settleSubmission,
  sha256Hex,
} from '@muicv/shared';

import { charge, credit, type WalletEnv } from '../wallet.ts';

/**
 * 提交计费：预扣（hold）→ 结算（settle）。全程幂等：
 *   - 流水 id 由提交 id 派生：`jobsub:<id>:hold` / `:refund` / `:reward`，重放不会重复扣 / 退 / 奖
 *   - jobSubmission.status 只允许 held → settled 一次（UPDATE … WHERE status='held' RETURNING）
 * 预扣走原子扣账，扣的就是估算上限；结算时按规则退回差额，必要时再发奖励。
 */

export function ledgerIds(submissionId: string): { hold: string; refund: string; reward: string } {
  const base = `jobsub:${submissionId}`;
  return { hold: `${base}:hold`, refund: `${base}:refund`, reward: `${base}:reward` };
}

function startOfUtcDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function holdForSubmission(
  env: WalletEnv,
  input: {
    submissionId: string;
    userId: string;
    url: string;
    visibility: JobSubmitVisibility;
    holdMicro: number;
    now: number;
  },
): Promise<{ ok: true } | { ok: false; balance: number }> {
  const urlHash = await sha256Hex(input.url);
  await env.MUICV_API_DB.prepare(
    `INSERT INTO jobSubmission (id, userId, url, urlHash, visibility, status, holdMicro, createdAt)
     VALUES (?, ?, ?, ?, ?, 'held', ?, ?)`,
  )
    .bind(input.submissionId, input.userId, input.url, urlHash, input.visibility, input.holdMicro, input.now)
    .run();
  const held = await charge(
    env,
    input.userId,
    input.holdMicro,
    'job_submit',
    { submissionId: input.submissionId, phase: 'hold', url: input.url },
    ledgerIds(input.submissionId).hold,
  );
  if (!held.ok) {
    await env.MUICV_API_DB.prepare(`UPDATE jobSubmission SET status = 'rejected', error = ? WHERE id = ?`)
      .bind('insufficient_balance', input.submissionId)
      .run();
    return { ok: false, balance: held.balance };
  }
  return { ok: true };
}

export type SettleInput = {
  submissionId: string;
  userId: string;
  visibility: JobSubmitVisibility;
  method: string;
  found: number;
  created: number;
  costMicro: number;
  holdMicro: number;
  result: unknown;
  error?: string | undefined;
  now: number;
};

export async function rewardCapped(env: WalletEnv, userId: string, now: number): Promise<boolean> {
  const row = await env.MUICV_API_DB.prepare(
    `SELECT COUNT(*) AS n FROM tokenLedger WHERE userId = ? AND type = 'job_submit_reward' AND createdAt >= ?`,
  )
    .bind(userId, startOfUtcDay(now))
    .first<{ n: number }>();
  return (row?.n ?? 0) >= JD_CONTRIBUTE_DAILY_CAP;
}

/** 结算；已结算过（重放）返回 null。 */
export async function settleSubmissionBilling(env: WalletEnv, input: SettleInput): Promise<SubmitSettlement | null> {
  const capped =
    input.visibility === 'public' && input.created > 0 ? await rewardCapped(env, input.userId, input.now) : false;
  const settlement = settleSubmission({
    visibility: input.visibility,
    found: input.found,
    created: input.created,
    costMicro: input.costMicro,
    holdMicro: input.holdMicro,
    rewardCapped: capped,
  });
  const claimed = await env.MUICV_API_DB.prepare(
    `UPDATE jobSubmission SET status = ?, method = ?, jobsFound = ?, jobsNew = ?, costMicro = ?, chargedMicro = ?,
       rewardMicro = ?, result = ?, error = ?, settledAt = ?
     WHERE id = ? AND status IN ('held', 'queued') RETURNING id`,
  )
    .bind(
      input.error ? 'failed' : 'settled',
      input.method,
      input.found,
      input.created,
      input.costMicro,
      settlement.chargeMicro,
      settlement.rewardMicro,
      JSON.stringify(input.result),
      input.error ?? null,
      input.now,
      input.submissionId,
    )
    .first<{ id: string }>();
  if (!claimed) return null;

  const ids = ledgerIds(input.submissionId);
  const meta = { submissionId: input.submissionId, method: input.method, found: input.found, created: input.created };
  await credit(env, input.userId, settlement.refundMicro, 'job_submit_refund', meta, ids.refund);
  await credit(env, input.userId, settlement.rewardMicro, 'job_submit_reward', meta, ids.reward);
  return settlement;
}

/**
 * 残留预扣按失败处理、全额退回（由定时任务调用）：
 *   - held 超过 30 分钟：同步处理途中崩溃
 *   - queued 超过 6 小时：队列重试 + DLQ 都没结算（兜底，正常由 DLQ 消费者退回）
 */
export const STALE_HOLD_MS = 30 * 60 * 1000;
export const STALE_QUEUED_MS = 6 * 60 * 60 * 1000;

export async function refundStaleHolds(env: WalletEnv, now = Date.now()): Promise<number> {
  const { results } = await env.MUICV_API_DB.prepare(
    `SELECT id, userId, visibility, holdMicro FROM jobSubmission
     WHERE (status = 'held' AND createdAt < ?) OR (status = 'queued' AND createdAt < ?) LIMIT 50`,
  )
    .bind(now - STALE_HOLD_MS, now - STALE_QUEUED_MS)
    .all<{ id: string; userId: string; visibility: JobSubmitVisibility; holdMicro: number }>();
  let refunded = 0;
  for (const row of results ?? []) {
    const settled = await settleSubmissionBilling(env, {
      submissionId: row.id,
      userId: row.userId,
      visibility: row.visibility,
      method: 'none',
      found: 0,
      created: 0,
      costMicro: 0,
      holdMicro: row.holdMicro,
      result: [],
      error: 'stale_hold',
      now,
    });
    if (settled) refunded++;
  }
  return refunded;
}

/** 标记为排队中（入队成功后调用）。 */
export async function markQueued(env: WalletEnv, submissionId: string): Promise<void> {
  await env.MUICV_API_DB.prepare(`UPDATE jobSubmission SET status = 'queued' WHERE id = ? AND status = 'held'`)
    .bind(submissionId)
    .run();
}
