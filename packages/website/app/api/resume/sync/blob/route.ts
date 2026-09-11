import { getCloudflareContext } from '@opennextjs/cloudflare';
import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** DELETE /api/resume/sync/blob —— 清空加密路径快照（活动版 + 全部历史 + R2 对象） */
export async function DELETE() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const db = await getDb();
  const [active] = await db
    .select({ blobId: schema.resumeSnapshotBlob.blobId })
    .from(schema.resumeSnapshotBlob)
    .where(eq(schema.resumeSnapshotBlob.userId, userId));
  const histRows = await db
    .select({ blobId: schema.resumeSnapshotBlobHistory.blobId })
    .from(schema.resumeSnapshotBlobHistory)
    .where(eq(schema.resumeSnapshotBlobHistory.userId, userId));

  const blobIds = new Set<string>();
  if (active) blobIds.add(active.blobId);
  for (const row of histRows) blobIds.add(row.blobId);

  const { env } = await getCloudflareContext({ async: true });
  for (const blobId of blobIds) {
    await env.MUICV_RESUME_BLOB.delete(`users/${userId}/blobs/${blobId}.zip`).catch(() => {});
  }

  await db.delete(schema.resumeSnapshotBlob).where(eq(schema.resumeSnapshotBlob.userId, userId));
  await db.delete(schema.resumeSnapshotBlobHistory).where(eq(schema.resumeSnapshotBlobHistory.userId, userId));

  return Response.json({ ok: true });
}
