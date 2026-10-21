import type { Metadata } from 'next';

import { ApiKeysSection } from '../api-keys-section';

export const metadata: Metadata = {
  title: 'API Keys',
};

export default function ApiKeysPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— API Keys</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Desktop app sign-in keys
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          The MuiCV desktop app on your devices signs in to cloud services with a key. Each key is shown only once when
          created, so keep it safe.
        </p>
      </header>

      <ApiKeysSection />
    </div>
  );
}
