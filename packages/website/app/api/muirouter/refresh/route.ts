import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/lib/db';
import { fetchMuirouterBalance } from '@/lib/muirouter';
import { type FreshAccessToken, getFreshMuirouterAccessToken } from '@/lib/muirouter-token';
import { getCurrentSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** POST /api/muirouter/refresh —— 重新调 muirouter 拿最新余额。 */
export async function POST(): Promise<Response> {
  const session = await getCurrentSession();
  if (!session?.user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let token: FreshAccessToken | null;
  try {
    token = await getFreshMuirouterAccessToken(session.user.id);
  } catch {
    return Response.json(
      { error: 'token-refresh-failed', message: 'access_token 续期失败，请重新关联 muirouter' },
      { status: 500 },
    );
  }
  if (!token) {
    return Response.json({ error: 'not-linked' }, { status: 404 });
  }

  const result = await fetchMuirouterBalance(token.accessToken);
  const balanceFields =
    result.status === 'ok'
      ? {
          currency: result.balance.currency,
          balanceCents: result.balance.balanceCents,
          lifetimeToppedUpCents: result.balance.lifetimeToppedUpCents,
          lifetimeSpentCents: result.balance.lifetimeSpentCents,
          balanceUpdatedAt: result.balance.updatedAt,
          lastError: null,
        }
      : { lastError: result.message };

  const db = await getDb();
  await db.update(schema.muirouterLink).set(balanceFields).where(eq(schema.muirouterLink.userId, session.user.id));

  return Response.json({
    status: result.status,
    message: result.status === 'ok' ? null : result.message,
    balance:
      result.status === 'ok'
        ? {
            currency: result.balance.currency,
            balanceCents: result.balance.balanceCents,
            lifetimeToppedUpCents: result.balance.lifetimeToppedUpCents,
            lifetimeSpentCents: result.balance.lifetimeSpentCents,
            updatedAt: result.balance.updatedAt.toISOString(),
          }
        : null,
  });
}
