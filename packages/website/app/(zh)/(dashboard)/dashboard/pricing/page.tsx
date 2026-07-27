import type { Metadata } from 'next';

import { PlansSection } from '../plans-section';

export const metadata: Metadata = {
  title: '订阅 / 充值',
};

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— 订阅 / 充值</p>
        <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.25rem)] font-extrabold leading-[1.15] tracking-tight text-ink">
          余额 · 订阅 · 流水
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          买月卡或年卡稳定续 Token，临时不够就买补充包。所有交易都会留在最近交易里查得到。
        </p>
      </header>

      <PlansSection />
    </div>
  );
}
