import { redirect } from 'next/navigation';

import { connectTarget } from '@/lib/connect-redirect';
import { getCurrentSession } from '@/lib/session';

import { ApproveForm } from './approve-form';
import { type ConnectLang, connectCopy } from './copy';

/**
 * 桌面端 / 浏览器扩展共用的 OAuth 式授权页（/connect 与 /en/connect）。
 *
 * 流程：
 *   1. 客户端生成随机 state，打开 /connect?state=xxx&redirect=<回跳>&app=<名字>
 *      - 桌面端：redirect=muicv://callback
 *      - 扩展：redirect=chrome.identity.getRedirectURL()（*.chromiumapp.org / *.extensions.allizom.org）
 *   2. 未登录 → 跳 sign-in?next=<原 url>；已登录 → 展示授权 UI
 *   3. 用户点"授权" → POST /api/connect/approve → 返回 { redirectUrl: "<回跳>?state=xxx&key=mui_xxx" }
 *   4. 浏览器跳 redirectUrl：桌面端由 OS 唤起 electron；扩展由 launchWebAuthFlow 拦截交给扩展
 *
 * 安全：state 由客户端生成并校验；redirect 走白名单（lib/connect-redirect）；key 可在后台撤销。
 */
export async function ConnectPage({
  lang,
  searchParams,
}: {
  lang: ConnectLang;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = pickStr(params.state);
  const redirectRaw = pickStr(params.redirect) ?? 'muicv://callback';
  const target = connectTarget(redirectRaw);
  const copy = connectCopy(lang, target ?? 'desktop');
  const appName = (pickStr(params.app) ?? (lang === 'en' ? 'MuiCV' : 'Mui简历')).slice(0, 40);

  if (!target || !state || state.length < 8 || state.length > 128) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-xl border-2 border-tongue/60 bg-tongue/5 p-7">
          <h1 className="text-xl font-extrabold text-ink">{copy.invalidTitle}</h1>
          <p className="mt-2 text-[14px] text-ink-soft">{copy.invalidBody}</p>
        </div>
      </main>
    );
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    const base = lang === 'en' ? '/en' : '';
    const here = `${base}/connect?state=${encodeURIComponent(state)}&redirect=${encodeURIComponent(redirectRaw)}&app=${encodeURIComponent(appName)}`;
    redirect(`${base}/sign-in?next=${encodeURIComponent(here)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-xl border-2 border-ink bg-cream p-7 shadow-[0_5px_0_0_var(--color-ink-line)]">
        <p className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-yellow-deep">{copy.eyebrow}</p>
        <h1 className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight text-ink">{copy.title}</h1>
        <p className="mt-3 text-[14px] leading-[1.65] text-ink-soft">{copy.body}</p>

        <div className="mt-5 space-y-2 rounded-xl border border-rule bg-paper px-4 py-3 text-[14px] leading-[1.6]">
          <ConnectionLine label={copy.account} value={session.user.email ?? copy.accountFallback} />
          <ConnectionLine label={copy.connectTo} value={appName} />
        </div>

        <ApproveForm state={state} redirect={redirectRaw} appName={appName} lang={lang} target={target} />

        <p className="mt-5 text-center text-[12px] text-mute">{copy.footer}</p>
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

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
