import type { Metadata } from 'next';

import { PlansSection } from '../plans-section';

export const metadata: Metadata = {
  title: 'Plans & top-up',
};

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— Plans & top-up</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          Balance · subscription · history
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          Subscribe monthly or yearly for steady tokens, or buy a pack when you run low. Every transaction is listed
          under Recent transactions.
        </p>
      </header>

      <PlansSection />
    </div>
  );
}
