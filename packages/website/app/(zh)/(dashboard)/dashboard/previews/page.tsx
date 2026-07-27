import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getAuth } from '@/lib/auth';
import { listUserPhotoUploads, listUserPreviews } from '@/lib/preview';

import { PhotoHistoryList, PreviewList } from './preview-list';

export const metadata: Metadata = {
  title: '在线预览',
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
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 在线预览</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          可分享链接
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          桌面 app 或 muicv-render skill 创建的预览链接会在这里。复制 URL 发给 HR；过期前可以续期；不想被看的就撤销。
          公开模式（public）允许搜索引擎抓取；默认 link 模式仅持链接者可见。
        </p>
      </header>

      <PreviewList items={previews} />

      <section className="rounded-xl border-2 border-rule bg-paper p-6">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-mute">— 证件照</p>
        <h2 className="mt-2 text-[18px] font-extrabold text-ink">
          已上传的照片
          <span className="ml-2 rounded-md bg-fluff px-2 py-0.5 font-mono text-[12px] tabular-nums">
            {photos.length}
          </span>
        </h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          桌面 app 里上传的所有照片都会显示在下面，按上传时间倒序。URL 可以直接填到 TemplateResumeData.photoUrl （新模板
          t1~t6 任选）。
        </p>
        <PhotoHistoryList items={photos} />
      </section>
    </div>
  );
}
