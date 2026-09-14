import { getCloudflareContext } from '@opennextjs/cloudflare';
import { desc, eq } from 'drizzle-orm';

import { getDb, schema } from './db';

export type CommunityJdPublic = {
  id: string;
  canonicalUrl: string;
  sourceSite: string;
  title: string | null;
  company: string | null;
  location: string | null;
  employmentType: string | null;
  markdown: string;
  createdAt: number;
};

function toPublic(row: typeof schema.communityJd.$inferSelect): CommunityJdPublic {
  return {
    id: row.id,
    canonicalUrl: row.canonicalUrl,
    sourceSite: row.sourceSite,
    title: row.title,
    company: row.company,
    location: row.location,
    employmentType: row.employmentType,
    markdown: row.markdown,
    createdAt: row.createdAt,
  };
}

export async function listPublishedJds(
  opts: { q?: string | undefined; site?: string | undefined; limit?: number | undefined } = {},
): Promise<CommunityJdPublic[]> {
  const limit = Math.min(opts.limit ?? 30, 50);
  const q = opts.q
    ?.trim()
    .replace(/['"^:()*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (q) {
    const { env } = await getCloudflareContext({ async: true });
    const stmt = opts.site
      ? env.MUICV_DB.prepare(
          `SELECT j.* FROM communityJdFts f JOIN communityJd j ON j.rowid = f.rowid
           WHERE communityJdFts MATCH ? AND j.status = 'published' AND j.sourceSite = ?
           ORDER BY rank LIMIT ?`,
        ).bind(q, opts.site, limit)
      : env.MUICV_DB.prepare(
          `SELECT j.* FROM communityJdFts f JOIN communityJd j ON j.rowid = f.rowid
           WHERE communityJdFts MATCH ? AND j.status = 'published'
           ORDER BY rank LIMIT ?`,
        ).bind(q, limit);
    const rows = await stmt.all<typeof schema.communityJd.$inferSelect>();
    return (rows.results ?? []).map(toPublic);
  }
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.communityJd)
    .where(eq(schema.communityJd.status, 'published'))
    .orderBy(desc(schema.communityJd.createdAt))
    .limit(limit);
  return rows.filter((r) => (opts.site ? r.sourceSite === opts.site : true)).map(toPublic);
}

export async function getPublishedJd(id: string): Promise<CommunityJdPublic | null> {
  const db = await getDb();
  const rows = await db.select().from(schema.communityJd).where(eq(schema.communityJd.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.status !== 'published') return null;
  return toPublic(row);
}

export async function listUserJds(
  userId: string,
): Promise<Array<CommunityJdPublic & { status: string; awardedGuess: boolean }>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.communityJd)
    .where(eq(schema.communityJd.contributorUserId, userId))
    .orderBy(desc(schema.communityJd.createdAt))
    .limit(100);
  return rows.map((r) => ({ ...toPublic(r), status: r.status, awardedGuess: true }));
}

export async function listAllJdsForAdmin(limit = 80): Promise<Array<CommunityJdPublic & { status: string }>> {
  const db = await getDb();
  const rows = await db.select().from(schema.communityJd).orderBy(desc(schema.communityJd.createdAt)).limit(limit);
  return rows.map((r) => ({ ...toPublic(r), status: r.status }));
}

export async function hideJd(id: string): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const result = await env.MUICV_DB.prepare(
    `UPDATE communityJd SET status = 'hidden', updatedAt = ? WHERE id = ? AND status = 'published'`,
  )
    .bind(Date.now(), id)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
