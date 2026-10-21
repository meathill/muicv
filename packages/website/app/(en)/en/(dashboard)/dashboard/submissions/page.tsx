import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { listUserSubmissions } from '@/lib/job-submissions';

import { SubmissionList } from './submission-list';

export const metadata: Metadata = { title: 'Submissions' };

export default async function SubmissionsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const page = await listUserSubmissions(session.user.id);

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Browser extension</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Submissions & credits
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Every page you submit with the extension shows up here: queue and processing status, the jobs found, and the
          hold, refund, charge and reward for each submission. Public submissions with jobs found are free (even
          duplicates), and new jobs earn a reward. Submissions with no jobs found, or saved privately, are charged the
          actual AI cost, with any unused hold refunded.
        </p>
      </header>
      <SubmissionList initial={page} />
    </div>
  );
}
