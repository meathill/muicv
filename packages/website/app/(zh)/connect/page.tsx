import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentSession } from '@/lib/session';

import { ApproveForm } from './approve-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '连接桌面端',
  description: '确认 Mui简历桌面端登录到你的账号。',
  robots: { index: false, follow: false },
};

/**
 * Desktop OAuth-style 授权页。
 *
 * 流程：
 *   1. Electron app 生成随机 state，打开 https://muicv.com/connect?state=xxx&redirect=muicv://callback&app=Mui简历
 *   2. 这一页：未登录 → 跳 /sign-in?next=<原 url>；已登录 → 展示授权 UI
 *   3. 用户点"授权" → POST /api/connect/approve → 返回 { redirectUrl: "muicv://callback?state=xxx&key=mui_xxx" }
 *   4. 浏览器 navigate 到 muicv:// → OS 唤起 electron → 主进程拿到 key 自动登录
 *
 * 安全考虑：
 *   - state 由 client（electron）生成 + 校验，防 CSRF
 *   - redirect 必须以 muicv:// 开头，防 open redirect
 *   - 即使授权页被钓鱼也只能拿到一个 mui_ key（用户能从 dashboard 撤销）
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = pickStr(params.state);
  const redirectRaw = pickStr(params.redirect) ?? 'muicv://callback';
  const appName = pickStr(params.app) ?? 'Mui简历桌面端';

  // 防 open redirect：只允许 muicv:// scheme
  const redirect_uri = redirectRaw.startsWith('muicv://') ? redirectRaw : 'muicv://callback';

  if (!state || state.length < 8 || state.length > 128) return <ErrorCard />;

  const session = await getCurrentSession();
  if (!session?.user) {
    // 用 next 把整个 connect URL 带回，登录后回来继续
    const here = `/connect?state=${encodeURIComponent(state)}&redirect=${encodeURIComponent(redirect_uri)}&app=${encodeURIComponent(appName)}`;
    redirect(`/sign-in?next=${encodeURIComponent(here)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border-2 border-ink bg-cream p-7 shadow-[0_5px_0_0_var(--color-ink-line)]">
        <p className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-yellow-deep">连接确认</p>
        <h1 className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight text-ink">登录到 Mui简历桌面端</h1>
        <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">
          确认后，浏览器会自动打开桌面 app。回到 app 继续整理简历就好。
        </p>

        <div className="mt-5 space-y-2 rounded-xl border border-rule bg-paper px-4 py-3 text-[14px] leading-[1.6]">
          <ConnectionLine label="当前账号" value={session.user.email ?? '已登录账号'} />
          <ConnectionLine label="连接到" value={appName} />
        </div>

        <ApproveForm state={state} redirect={redirect_uri} appName={appName} />

        <p className="mt-5 text-center text-[12px] text-mute">看着不对？关闭这个窗口，就不会完成连接。</p>
      </div>
    </main>
  );
}

function ConnectionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[12px] font-bold text-mute">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function ErrorCard() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border-2 border-tongue/60 bg-tongue/5 p-7">
        <h1 className="text-xl font-extrabold text-ink">登录请求已失效</h1>
        <p className="mt-2 text-[14px] text-ink-soft">请回到桌面 app，重新点一次登录。</p>
      </div>
    </main>
  );
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
