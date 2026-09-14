import {
  type CapturedJd,
  canonicalizeUrl,
  countCodePoints,
  displayToMicro,
  JD_CONTRIBUTE_DAILY_CAP,
  JD_CONTRIBUTE_REWARD,
  JD_MARKDOWN_MIN_CHARS,
  microToDisplay,
  sha256Hex,
  siteIdForHost,
} from '@muicv/shared';

import { credit, ensureBalance, type WalletEnv } from './wallet.ts';

export type CommunityJdRow = {
  id: string;
  canonicalUrl: string;
  urlHash: string;
  contentHash: string;
  sourceSite: string;
  title: string | null;
  company: string | null;
  location: string | null;
  employmentType: string | null;
  markdown: string;
  contributorUserId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type ContributeResult =
  | { ok: true; id: string; awarded: number; duplicate: boolean; balance: number }
  | { ok: false; status: 400 | 429; error: string };

const REWARD_MICRO = displayToMicro(JD_CONTRIBUTE_REWARD);

function startOfUtcDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function contributeJd(
  env: WalletEnv,
  userId: string,
  jd: CapturedJd,
  now = Date.now(),
): Promise<ContributeResult> {
  const markdown = jd.markdown.trim();
  if (countCodePoints(markdown) < JD_MARKDOWN_MIN_CHARS) {
    return { ok: false, status: 400, error: `JD 正文至少 ${JD_MARKDOWN_MIN_CHARS} 字` };
  }
  if (!jd.title && !jd.company) {
    return { ok: false, status: 400, error: '至少要有职位或公司名' };
  }

  const canonicalUrl = canonicalizeUrl(jd.canonicalUrl || jd.url);
  const urlHash = await sha256Hex(canonicalUrl);
  const contentHash = await sha256Hex(markdown.replace(/\s+/g, ' ').trim());
  const sourceSite = jd.sourceSite || siteIdForHost(new URL(canonicalUrl).hostname);

  const dup = await env.MUICV_API_DB.prepare(`SELECT id FROM communityJd WHERE urlHash = ? OR contentHash = ? LIMIT 1`)
    .bind(urlHash, contentHash)
    .first<{ id: string }>();
  if (dup) {
    const wallet = await ensureBalance(env, userId);
    return { ok: true, id: dup.id, awarded: 0, duplicate: true, balance: microToDisplay(wallet.balance) };
  }

  const since = startOfUtcDay(now);
  const cap = await env.MUICV_API_DB.prepare(
    `SELECT COUNT(*) AS n FROM tokenLedger WHERE userId = ? AND type = 'jd_contribute' AND createdAt >= ?`,
  )
    .bind(userId, since)
    .first<{ n: number }>();
  if ((cap?.n ?? 0) >= JD_CONTRIBUTE_DAILY_CAP) {
    return { ok: false, status: 429, error: '今日贡献奖励已达上限，明天再来' };
  }

  await ensureBalance(env, userId);
  const id = crypto.randomUUID();
  await env.MUICV_API_DB.prepare(
    `INSERT INTO communityJd (id, canonicalUrl, urlHash, contentHash, sourceSite, title, company, location, employmentType, markdown, contributorUserId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
  )
    .bind(
      id,
      canonicalUrl,
      urlHash,
      contentHash,
      sourceSite,
      jd.title,
      jd.company,
      jd.location,
      jd.employmentType,
      markdown,
      userId,
      now,
      now,
    )
    .run();

  try {
    await env.MUICV_API_DB.prepare(
      `INSERT INTO communityJdFts(rowid, title, company, location, markdown)
       SELECT rowid, title, company, location, markdown FROM communityJd WHERE id = ?`,
    )
      .bind(id)
      .run();
  } catch {
    /* FTS 表在单测或尚未 migrate 时可能不存在，不挡入库 */
  }

  const credited = await credit(env, userId, REWARD_MICRO, 'jd_contribute', { jdId: id, canonicalUrl }, id);
  return {
    ok: true,
    id,
    awarded: JD_CONTRIBUTE_REWARD,
    duplicate: false,
    balance: microToDisplay(credited.balance),
  };
}

export async function getPublishedJd(env: WalletEnv, id: string): Promise<CommunityJdRow | null> {
  return env.MUICV_API_DB.prepare(`SELECT * FROM communityJd WHERE id = ? AND status = 'published' LIMIT 1`)
    .bind(id)
    .first<CommunityJdRow>();
}

export async function searchPublishedJds(
  env: WalletEnv,
  opts: { q?: string; site?: string; limit?: number; offset?: number },
): Promise<CommunityJdRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);
  const q = opts.q
    ?.trim()
    .replace(/['"^:()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (q) {
    const rows = await env.MUICV_API_DB.prepare(
      `SELECT j.* FROM communityJdFts f
       JOIN communityJd j ON j.rowid = f.rowid
       WHERE communityJdFts MATCH ? AND j.status = 'published'
       ${opts.site ? 'AND j.sourceSite = ?' : ''}
       ORDER BY rank
       LIMIT ? OFFSET ?`,
    )
      .bind(...(opts.site ? [q, opts.site, limit, offset] : [q, limit, offset]))
      .all<CommunityJdRow>();
    return rows.results;
  }
  const rows = await env.MUICV_API_DB.prepare(
    `SELECT * FROM communityJd WHERE status = 'published' ${opts.site ? 'AND sourceSite = ?' : ''}
     ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
  )
    .bind(...(opts.site ? [opts.site, limit, offset] : [limit, offset]))
    .all<CommunityJdRow>();
  return rows.results;
}

export async function listUserContributions(env: WalletEnv, userId: string, limit = 50): Promise<CommunityJdRow[]> {
  const rows = await env.MUICV_API_DB.prepare(
    `SELECT * FROM communityJd WHERE contributorUserId = ? ORDER BY createdAt DESC LIMIT ?`,
  )
    .bind(userId, limit)
    .all<CommunityJdRow>();
  return rows.results;
}

export async function hideCommunityJd(env: WalletEnv, id: string, now = Date.now()): Promise<boolean> {
  const result = await env.MUICV_API_DB.prepare(
    `UPDATE communityJd SET status = 'hidden', updatedAt = ? WHERE id = ? AND status = 'published'`,
  )
    .bind(now, id)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
