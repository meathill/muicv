import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

import { getAuth } from '@/lib/auth';
import { listUserJds } from '@/lib/community-jd';

export const metadata: Metadata = { title: 'My contributed jobs' };

export default async function DashboardJobsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const items = await listUserJds(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Community</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          My contributed jobs
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Job descriptions you contributed with the browser extension. A first-time addition to the community earns 2000
          tokens; duplicate URLs or content earn nothing.
        </p>
      </header>
      <ul className="space-y-2">
        {items.length === 0 ? (
          <li className="rounded-xl border-2 border-rule bg-paper px-4 py-5 text-[14px] text-ink-soft">
            No contributions yet. Open a job page and submit it with the extension.
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-rule bg-cream px-4 py-3"
            >
              <div>
                <p className="text-[14px] font-extrabold text-ink">{item.title ?? 'Untitled'}</p>
                <p className="text-[12px] text-mute">
                  {item.company ?? 'Unknown company'} · {item.status === 'hidden' ? 'Hidden' : 'Published'}
                </p>
              </div>
              {item.status === 'published' ? (
                <Link href={`/jobs/${item.id}`} className="text-[12px] font-bold text-ink">
                  View
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
