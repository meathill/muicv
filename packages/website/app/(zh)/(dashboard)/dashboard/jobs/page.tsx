import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

import { getAuth } from '@/lib/auth';
import { listUserJds } from '@/lib/community-jd';

export const metadata: Metadata = { title: '我贡献的岗位' };

export default async function DashboardJobsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const items = await listUserJds(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 社区</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          我贡献的岗位
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          通过浏览器扩展主动贡献的 JD。首次被社区收录会奖励 2000 token；重复的 URL / 正文不发奖。
        </p>
      </header>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="rounded-xl border-2 border-rule bg-paper px-4 py-5 text-[14px] text-ink-soft">
            还没有贡献。打开招聘页，用扩展点「贡献给社区」。
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-rule bg-cream px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-extrabold text-ink">{item.title ?? '未命名'}</p>
                <p className="text-[12px] text-mute">
                  {item.company ?? '未知公司'} · {item.status === 'hidden' ? '已下架' : '已发布'}
                </p>
              </div>
              {item.status === 'published' ? (
                <Link href={`/jobs/${item.id}`} className="text-[12px] font-bold text-ink">
                  查看
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
