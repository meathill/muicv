import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { listUserPhotoUploads, listUserPreviews } from '@/lib/preview';

import { PhotoHistoryList, PreviewList } from './preview-list';

export const metadata: Metadata = {
  title: 'Online previews',
};

export default async function PreviewsPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const [previews, photos] = await Promise.all([
    listUserPreviews(session.user.id),
    listUserPhotoUploads(session.user.id),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Online previews</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Shareable links
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Preview links created by the desktop app or the muicv-render skill show up here. Copy the URL for recruiters,
          extend before it expires, or revoke it. Public mode lets search engines index it; the default link mode is
          visible only to people with the link.
        </p>
      </header>

      <PreviewList items={previews} />

      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— Photos</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">
          Uploaded photos
          <span className="ml-2 rounded-md bg-fluff px-2 py-0.5 font-mono text-[12px] tabular-nums">
            {photos.length}
          </span>
        </h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          All photos uploaded in the desktop app appear below, newest first. Use the URL as TemplateResumeData.photoUrl
          (templates t1–t6).
        </p>
        <PhotoHistoryList items={photos} />
      </section>
    </div>
  );
}
