import { hideJd, listAllJdsForAdmin } from '@/lib/community-jd';

import { AdminNav } from '../_components/admin-nav';

export const dynamic = 'force-dynamic';

async function hideAction(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  if (id) await hideJd(id);
}

export default async function AdminJobsPage() {
  const items = await listAllJdsForAdmin();
  return (
    <div>
      <AdminNav active="/admin/jobs" />
      <h1 className="mt-6 text-[24px] font-extrabold text-ink">社区岗位</h1>
      <p className="mt-2 text-[14px] text-ink-soft">投诉下架走这里。下架不追回 token。</p>
      <ul className="mt-6 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-rule bg-cream px-4 py-3"
          >
            <div>
              <p className="text-[14px] font-extrabold">
                {item.title ?? '未命名'} · {item.company ?? ''}
              </p>
              <p className="text-[12px] text-mute">
                {item.sourceSite} · {item.status}
              </p>
            </div>
            {item.status === 'published' ? (
              <form action={hideAction}>
                <input type="hidden" name="id" value={item.id} />
                <button type="submit" className="rounded-md border-2 border-ink px-3 py-1 text-[12px] font-bold">
                  下架
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
