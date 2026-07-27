import type { Metadata } from 'next';
import Link from 'next/link';

import { CorgiMascot } from '@/components/corgi-mascot';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 阳光底纹 */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--color-corgi) 55%, transparent) 0%, color-mix(in srgb, var(--color-fluff) 40%, transparent) 35%, transparent 75%)',
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-10 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2.5 self-start text-ink no-underline">
          <CorgiMascot className="h-9 w-9" />
          <span className="text-[18px] font-bold tracking-tight">Mui简历</span>
        </Link>

        <div className="mt-12 sm:mt-16">{children}</div>

        <p className="mt-auto pt-12 text-center text-[12px] text-mute">
          继续即表示同意{' '}
          <Link href="/" className="underline decoration-corgi underline-offset-4 hover:text-ink">
            服务条款
          </Link>{' '}
          与隐私政策（占位，待补）。
        </p>
      </div>
    </main>
  );
}
