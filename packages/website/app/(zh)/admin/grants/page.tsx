import { microToDisplay } from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import Link from 'next/link';

import { AdminNav } from '../_components/admin-nav';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type Row = {
  id: string;
  userId: string;
  delta: number;
  type: string;
  meta: string | null;
  createdAt: number;
  email: string | null;
};

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseMeta(meta: string | null): Record<string, unknown> | null {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

export default async function AdminGrantsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const params = await props.searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { env } = await getCloudflareContext({ async: true });
  const result = await env.MUICV_DB.prepare(
    `SELECT l.id, l.userId, l.delta, l.type, l.meta, l.createdAt, u.email
       FROM tokenLedger l
       LEFT JOIN user u ON u.id = l.userId
      WHERE l.type IN ('admin_grant', 'admin_deduct')
      ORDER BY l.createdAt DESC
      LIMIT ?1 OFFSET ?2`,
  )
    .bind(PAGE_SIZE, offset)
    .all<Row>();
  const rows = result.results ?? [];
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <AdminNav active="/admin/grants" />

      <div>
        <h1 className="text-[24px] font-extrabold text-ink">赠予记录</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          所有 admin_grant / admin_deduct 流水审计；按时间倒序，每页 {PAGE_SIZE} 条。
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border-2 border-rule bg-cream px-4 py-8 text-center text-[14px] text-mute">
          还没有任何后台调账记录。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border-2 border-rule bg-cream">
          <table className="min-w-full text-[14px]">
            <thead className="border-b border-rule bg-fluff text-left font-mono text-[12px] uppercase tracking-wider text-mute">
              <tr>
                <th className="px-4 py-2">时间</th>
                <th className="px-4 py-2">用户</th>
                <th className="px-4 py-2 text-right">变动</th>
                <th className="px-4 py-2">操作人</th>
                <th className="px-4 py-2">原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((row) => {
                const meta = parseMeta(row.meta);
                return (
                  <tr key={row.id} className="hover:bg-fluff/40">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-[12px] text-mute">
                      {formatTimestamp(row.createdAt)}
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/users/${row.userId}`} className="font-mono text-yellow-deep hover:underline">
                        {row.email ?? row.userId}
                      </Link>
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono font-bold tabular-nums ${
                        row.delta > 0 ? 'text-yellow-deep' : 'text-amber'
                      }`}
                    >
                      {row.delta > 0 ? '+' : ''}
                      {microToDisplay(row.delta).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono text-[12px] text-ink-soft">
                      {meta?.grantedBy ? String(meta.grantedBy) : '—'}
                    </td>
                    <td className="px-4 py-2 text-ink-soft">{meta?.reason ? String(meta.reason) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-[14px] text-ink-soft">
        <span>
          第 {page} 页 · {rows.length} 条
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/grants${page - 1 > 1 ? `?page=${page - 1}` : ''}`}
              className="press-ink rounded-lg border-2 border-rule bg-cream px-3 py-1.5 font-bold"
            >
              ← 上一页
            </Link>
          )}
          {hasNext && (
            <Link
              href={`/admin/grants?page=${page + 1}`}
              className="press-ink rounded-lg border-2 border-rule bg-cream px-3 py-1.5 font-bold"
            >
              下一页 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
