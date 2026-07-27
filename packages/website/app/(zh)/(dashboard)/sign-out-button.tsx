'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signOut } from '@/lib/auth-client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      await signOut();
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="press-ink rounded-lg border-2 border-ink bg-cream px-3 py-1.5 text-[14px] font-bold text-ink disabled:opacity-60"
    >
      {busy ? '退出中…' : '退出'}
    </button>
  );
}
