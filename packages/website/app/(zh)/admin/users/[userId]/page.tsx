import { microToDisplay } from '@muicv/shared';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDb, schema } from '@/lib/db';
import { listLedger, readBalance } from '@/lib/wallet';

import { AdminNav } from '../../_components/admin-nav';
import { GrantForm } from '../../_components/grant-form';
import { LocalTime } from '../../_components/local-time';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

const LEDGER_TYPE_LABEL: Record<string, string> = {
  signup_bonus: '注册赠送',
  subscription: '订阅续费',
  topup: '补充包',
  llm: 'LLM 调用',
  pdf_render: 'PDF 渲染',
  jd_fetch: 'JD 抓取',
  stt_transcribe: '语音转写',
  admin_grant: '后台补发',
  admin_deduct: '后台扣款',
};

const SUB_STATUS_LABEL: Record<string, string> = {
  active: '生效中',
  trialing: '试用中',
  past_due: '续费失败（请修复支付方式）',
  canceled: '已取消',
  incomplete: '未完成',
  incomplete_expired: '未完成已过期',
  unpaid: '欠费',
};

function parseMeta(meta: string | null): Record<string, unknown> | null {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch {
    return null;
  }
}

function normalizeType(raw: string | undefined): string {
  if (!raw || raw === 'all') return 'all';
  return raw in LEDGER_TYPE_LABEL ? raw : 'all';
}

function normalizeOrder(raw: string | undefined): 'asc' | 'desc' {
  return raw === 'asc' ? 'asc' : 'desc';
}

function normalizePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10);
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

export default async function AdminUserDetailPage(props: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ p?: string; order?: string; type?: string }>;
}) {
  const { userId } = await props.params;
  const sp = await props.searchParams;
  const page = normalizePage(sp.p);
  const order = normalizeOrder(sp.order);
  const type = normalizeType(sp.type);

  const db = await getDb();

  const userRows = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      name: schema.user.name,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  const user = userRows[0];
  if (!user) notFound();

  const balance = await readBalance(userId);
  const subRows = await db
    .select({
      status: schema.subscription.status,
      stripePriceId: schema.subscription.stripePriceId,
      monthlyTokens: schema.subscription.monthlyTokens,
      currentPeriodEnd: schema.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: schema.subscription.cancelAtPeriodEnd,
    })
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, userId))
    .limit(1);
  const sub = subRows[0];

  const ledger = await listLedger(userId, {
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    order,
    ...(type === 'all' ? {} : { type }),
  });
  const hasNext = ledger.length === PAGE_SIZE;
  const hasFilter = type !== 'all' || order !== 'desc';

  function buildQuery(overrides: { p?: number; order?: 'asc' | 'desc'; type?: string }) {
    const usp = new URLSearchParams();
    const nextP = overrides.p ?? page;
    if (nextP > 1) usp.set('p', String(nextP));
    const nextOrder = overrides.order ?? order;
    if (nextOrder !== 'desc') usp.set('order', nextOrder);
    const nextType = overrides.type ?? type;
    if (nextType !== 'all') usp.set('type', nextType);
    const s = usp.toString();
    return s ? `?${s}` : '';
  }

  const basePath = `/admin/users/${user.id}`;

  return (
    <div className="space-y-6">
      <AdminNav active="/admin/users" />

      <div className="flex items-baseline gap-3">
        <Link href="/admin/users" className="text-[14px] text-ink-soft hover:text-ink">
          ← 返回用户列表
        </Link>
      </div>

      <header className="rounded-xl border-2 border-ink bg-cream p-6 shadow-[0_4px_0_0_var(--color-ink-line)]">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 用户详情</p>
        <h1 className="mt-2 text-[20px] font-extrabold text-ink">{user.name || user.email.split('@')[0]}</h1>
        <p className="mt-1 font-mono text-[14px] text-ink-soft">{user.email}</p>
        <p className="mt-1 font-mono text-[12px] text-mute">
          ID {user.id} · 注册于 <LocalTime ms={user.createdAt.getTime()} />
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-rule bg-fluff/40 p-3">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">当前余额</dt>
            <dd className="mt-1 font-mono text-[18px] font-extrabold tabular-nums text-yellow-deep">
              {balance ? microToDisplay(balance.balance).toLocaleString() : '0'} tokens
            </dd>
          </div>
          <div className="rounded-lg border border-rule bg-fluff/40 p-3">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">累计获得</dt>
            <dd className="mt-1 font-mono text-[16px] tabular-nums text-ink">
              {balance ? microToDisplay(balance.lifetimeEarned).toLocaleString() : '0'}
            </dd>
          </div>
          <div className="rounded-lg border border-rule bg-fluff/40 p-3">
            <dt className="font-mono text-[12px] uppercase tracking-wider text-mute">累计消耗</dt>
            <dd className="mt-1 font-mono text-[16px] tabular-nums text-ink">
              {balance ? microToDisplay(balance.lifetimeSpent).toLocaleString() : '0'}
            </dd>
          </div>
        </dl>

        {sub && (
          <div className="mt-4 rounded-lg border border-rule bg-cream p-3 text-[14px]">
            <p className="font-bold text-ink">
              订阅：{SUB_STATUS_LABEL[sub.status] ?? sub.status}
              {sub.cancelAtPeriodEnd ? '（周期末取消）' : ''}
            </p>
            {sub.currentPeriodEnd && (
              <p className="mt-1 text-ink-soft">
                下次{sub.cancelAtPeriodEnd ? '到期' : '续费'}：<LocalTime ms={sub.currentPeriodEnd.getTime()} />
                {sub.monthlyTokens != null && (
                  <span className="ml-1">（+{sub.monthlyTokens.toLocaleString()} tokens / 周期）</span>
                )}
              </p>
            )}
          </div>
        )}
      </header>

      <section className="rounded-xl border-2 border-yellow-deep bg-fluff/30 p-6">
        <h2 className="text-[16px] font-extrabold text-ink">赠送 token</h2>
        <p className="mt-1 text-[12px] text-ink-soft">
          走 wallet.credit() 原子入账，type=admin_grant，meta 自动写入 grantedBy 与 reason，可在赠予记录页审计。
        </p>
        <div className="mt-4">
          <GrantForm userId={user.id} userEmail={user.email} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[16px] font-extrabold text-ink">交易流水</h2>
          <p className="font-mono text-[12px] text-mute">每页 {PAGE_SIZE} 条</p>
        </div>

        <form action={basePath} method="get" className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            类型
            <select
              name="type"
              defaultValue={type}
              className="rounded-lg border-2 border-rule bg-cream px-2 py-1.5 text-[12px] text-ink focus:border-ink focus:outline-none"
            >
              <option value="all">全部</option>
              {Object.entries(LEDGER_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            排序
            <select
              name="order"
              defaultValue={order}
              className="rounded-lg border-2 border-rule bg-cream px-2 py-1.5 text-[12px] text-ink focus:border-ink focus:outline-none"
            >
              <option value="desc">最新优先</option>
              <option value="asc">最早优先</option>
            </select>
          </label>
          <button
            type="submit"
            className="press-ink rounded-lg border-2 border-ink bg-yellow px-3 py-1.5 text-[12px] font-bold text-ink"
          >
            应用
          </button>
          {hasFilter && (
            <Link
              href={basePath}
              className="press-ink inline-flex items-center rounded-lg border-2 border-rule bg-cream px-3 py-1.5 text-[12px] font-bold text-ink-soft"
            >
              重置
            </Link>
          )}
        </form>

        {ledger.length === 0 ? (
          <p className="mt-3 rounded-xl border-2 border-rule bg-cream px-4 py-8 text-center text-[14px] text-mute">
            {hasFilter || page > 1 ? '当前筛选下没有流水。' : '还没有任何流水。'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-rule rounded-xl border-2 border-rule bg-cream">
            {ledger.map((row) => {
              const meta = parseMeta(row.meta);
              const isAdminAction = row.type === 'admin_grant' || row.type === 'admin_deduct';
              const isLlm = row.type === 'llm';
              const llmModel = isLlm ? (typeof meta?.model === 'string' ? meta.model : '—') : null;
              const llmPrompt = isLlm && typeof meta?.promptTokens === 'number' ? meta.promptTokens : null;
              const llmCompletion = isLlm && typeof meta?.completionTokens === 'number' ? meta.completionTokens : null;
              const llmCached =
                isLlm && typeof meta?.cachedTokens === 'number' && meta.cachedTokens > 0 ? meta.cachedTokens : null;
              return (
                <li
                  key={row.id}
                  className={`flex items-start justify-between gap-4 px-4 py-3 text-[14px] ${
                    isAdminAction ? 'bg-fluff/40' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {LEDGER_TYPE_LABEL[row.type] ?? row.type}
                      {isLlm && <span className="ml-1.5 font-mono text-[12px] text-ink-soft">· {llmModel}</span>}
                    </p>
                    <p className="mt-0.5 font-mono text-[12px] text-mute">
                      <LocalTime ms={row.createdAt} />
                    </p>
                    {isLlm && llmPrompt != null && llmCompletion != null && (
                      <p className="mt-0.5 font-mono text-[12px] text-mute">
                        prompt {llmPrompt.toLocaleString()} / completion {llmCompletion.toLocaleString()}
                        {llmCached != null && ` (cached ${llmCached.toLocaleString()})`}
                      </p>
                    )}
                    {isAdminAction && meta && (
                      <p className="mt-1 text-[12px] text-ink-soft">
                        操作人：<span className="font-mono">{String(meta.grantedBy ?? '—')}</span>
                        {' · '}
                        原因：{String(meta.reason ?? '—')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[14px] font-bold tabular-nums ${
                      row.delta > 0 ? 'text-yellow-deep' : 'text-ink-soft'
                    }`}
                  >
                    {row.delta > 0 ? '+' : ''}
                    {microToDisplay(row.delta).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between text-[14px] text-ink-soft">
          <span>
            第 {page} 页 · {ledger.length} 条
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`${basePath}${buildQuery({ p: page - 1 })}`}
                className="press-ink rounded-lg border-2 border-rule bg-cream px-3 py-1.5 font-bold"
              >
                ← 上一页
              </Link>
            )}
            {hasNext && (
              <Link
                href={`${basePath}${buildQuery({ p: page + 1 })}`}
                className="press-ink rounded-lg border-2 border-rule bg-cream px-3 py-1.5 font-bold"
              >
                下一页 →
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
