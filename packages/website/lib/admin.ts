import { notFound, redirect } from 'next/navigation';

import { getCurrentSession } from './session';

/**
 * 管理员鉴权。白名单走 wrangler.jsonc 的 vars.ADMIN_EMAILS（逗号分隔，大小写无关）。
 *
 * 用 `notFound()` 而非 403：避免给非管理员暴露 /admin 路由的存在。
 * 未登录单独 redirect 到 /sign-in?next=/admin，因为这部分是合法用户体验。
 */

export async function getAdminEmails(): Promise<Set<string>> {
  return new Set(
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const list = await getAdminEmails();
  return list.has(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session?.user?.email) redirect('/sign-in?next=/admin');
  if (!(await isAdminEmail(session.user.email))) notFound();
  return session;
}
