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
