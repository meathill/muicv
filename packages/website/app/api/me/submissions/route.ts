import { listUserSubmissions } from '@/lib/job-submissions';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** GET /api/me/submissions?cursor=<createdAt>&limit=20 —— 登录用户自己的扩展提交记录（dashboard 轮询用）。 */
export async function GET(req: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const params = new URL(req.url).searchParams;
  const cursor = Number(params.get('cursor'));
  const limit = Number(params.get('limit'));
  const page = await listUserSubmissions(session.user.id, {
    cursor: Number.isFinite(cursor) && cursor > 0 ? cursor : null,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  });
  return Response.json(page, { headers: { 'cache-control': 'no-store' } });
}
