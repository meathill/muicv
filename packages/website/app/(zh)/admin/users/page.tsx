import { microToDisplay } from '@muicv/shared';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import Link from 'next/link';

import { AdminNav } from '../_components/admin-nav';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const SUB_STATUS_LABEL: Record<string, string> = {
  active: '生效中',
  trialing: '试用中',
  past_due: '续费失败',
  canceled: '已取消',
  incomplete: '未完成',
  incomplete_expired: '未完成已过期',
  unpaid: '欠费',
};

type Row = {
  id: string;
  email: string;
  name: string | null;
  createdAt: number;
  balance: number | null;
  lifetimeEarned: number | null;
  lifetimeSpent: number | null;
  subStatus: string | null;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default async function AdminUsersPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await props.searchParams;
  const q = (params.q ?? '').trim();
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // raw SQL 比 drizzle 三表 leftJoin 更直白；这里 JOIN tokenBalance + subscription 拿快照。
  const { env } = await getCloudflareContext({ async: true });
  const result = await env.MUICV_DB.prepare(
    `SELECT u.id, u.email, u.name, u.createdAt,
            b.balance, b.lifetimeEarned, b.lifetimeSpent,
            s.status as subStatus
       FROM user u
       LEFT JOIN tokenBalance b ON b.userId = u.id
       LEFT JOIN subscription s ON s.userId = u.id
      WHERE (?1 = '' OR LOWER(u.email) LIKE ?1)
      ORDER BY u.createdAt DESC
      LIMIT ?2 OFFSET ?3`,
  )
    .bind(q ? `%${q.toLowerCase()}%` : '', PAGE_SIZE, offset)
    .all<Row>();
  const rows = result.results ?? [];
  const hasNext = rows.length === PAGE_SIZE;

  function buildQueryString(overrides: { q?: string; page?: number }) {
    const usp = new URLSearchParams();
    const nextQ = overrides.q ?? q;
    if (nextQ) usp.set('q', nextQ);
    const nextPage = overrides.page ?? page;
    if (nextPage > 1) usp.set('page', String(nextPage));
    const s = usp.toString();
    return s ? `?${s}` : '';
  }

  return (
    <div className="space-y-6">
      <AdminNav active="/admin/users" />

      <div>
        <h1 className="text-[24px] font-extrabold text-ink">用户管理</h1>
        <p className="mt-1 text-[14px] text-ink-soft">
          每页 {PAGE_SIZE} 条；按 email 模糊搜索；点行进入详情、赠送 token。
        </p>
      </div>

      <form action="/admin/users" method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="按 email 搜索（模糊匹配）"
          className="flex-1 rounded-lg border-2 border-rule bg-cream px-3 py-2 text-[14px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          className="press-ink rounded-lg border-2 border-ink bg-yellow px-4 py-2 text-[14px] font-bold text-ink"
        >
          搜索
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="press-ink inline-flex items-center rounded-lg border-2 border-rule bg-cream px-4 py-2 text-[14px] font-bold text-ink-soft"
          >
            重置
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border-2 border-rule bg-cream px-4 py-8 text-center text-[14px] text-mute">
          {q ? `没有匹配「${q}」的用户。` : '还没有任何用户。'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border-2 border-rule bg-cream">
          <table className="min-w-full text-[14px]">
            <thead className="border-b border-rule bg-fluff text-left font-mono text-[12px] uppercase tracking-wider text-mute">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">名字</th>
                <th className="px-4 py-2">余额</th>
                <th className="px-4 py-2">订阅</th>
                <th className="px-4 py-2">注册</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-fluff/40">
                  <td className="px-4 py-2 font-mono">{row.email}</td>
                  <td className="px-4 py-2 text-ink-soft">{row.name ?? '—'}</td>
                  <td className="px-4 py-2 font-mono tabular-nums text-yellow-deep">
                    {row.balance != null ? microToDisplay(row.balance).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-ink-soft">
                    {row.subStatus ? (SUB_STATUS_LABEL[row.subStatus] ?? row.subStatus) : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px] text-mute">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-bold text-yellow-deep underline-offset-2 hover:underline"
                    >
                      详情 →
                    </Link>
                  </td>
                </tr>
              ))}
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
              href={`/admin/users${buildQueryString({ page: page - 1 })}`}
              className="press-ink rounded-lg border-2 border-rule bg-cream px-3 py-1.5 font-bold"
            >
              ← 上一页
            </Link>
          )}
          {hasNext && (
            <Link
              href={`/admin/users${buildQueryString({ page: page + 1 })}`}
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
