import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { listUserSubmissions } from '@/lib/job-submissions';

import { SubmissionList } from './submission-list';

export const metadata: Metadata = { title: '提交记录' };

export default async function SubmissionsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const page = await listUserSubmissions(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 浏览器扩展</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          提交记录与积分
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          用扩展提交的页面都在这里：排队 / 处理进度、识别到的岗位，以及每次的预扣、退还、扣费和奖励。
          提交到公共池且识别到岗位不扣费（重复也不扣），有新岗位入库发奖励；没识别到岗位或私藏，按实际 AI
          用量扣费，多退少不补。
        </p>
      </header>
      <SubmissionList initial={page} />
    </div>
  );
}
