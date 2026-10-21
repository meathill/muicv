import type { Metadata } from 'next';

import { MuirouterSection } from '../muirouter-section';

export const metadata: Metadata = {
  title: 'muirouter (BYOK)',
};

export default function MuirouterPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">
          — Bring your own API · muirouter
        </p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Your own LLM balance
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Once muirouter is linked, LLM calls use your own muirouter balance; PDF rendering and job fetching still use
          MuiCV tokens.
        </p>
      </header>

      <MuirouterSection />
    </div>
  );
}
