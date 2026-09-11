import { getCloudflareContext } from '@opennextjs/cloudflare';
import { and, eq } from 'drizzle-orm';

import { getDb, schema } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/resume/sync/blob/history/[id] —— 删除某个加密历史快照（D1 row + R2 对象）。
 * id 是 history 表的主键 row id，不是 blobId（更不可猜）。
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await ctx.params;
  const db = await getDb();
  const [row] = await db
    .select({ blobId: schema.resumeSnapshotBlobHistory.blobId })
    .from(schema.resumeSnapshotBlobHistory)
    .where(and(eq(schema.resumeSnapshotBlobHistory.id, id), eq(schema.resumeSnapshotBlobHistory.userId, userId)))
    .limit(1);
  if (!row) {
    return Response.json({ error: 'not-found' }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  await env.MUICV_RESUME_BLOB.delete(`users/${userId}/blobs/${row.blobId}.zip`).catch(() => {});

  await db
    .delete(schema.resumeSnapshotBlobHistory)
    .where(and(eq(schema.resumeSnapshotBlobHistory.id, id), eq(schema.resumeSnapshotBlobHistory.userId, userId)));

  return Response.json({ ok: true });
}
