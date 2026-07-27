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
          桌面应用登录凭证
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-ink-soft">
          在自己设备上安装的 muicv 桌面应用用凭证登录云服务。每个凭证只在创建时显示一次，请妥善保管。
        </p>
      </header>

      <ApiKeysSection />
    </div>
  );
}
