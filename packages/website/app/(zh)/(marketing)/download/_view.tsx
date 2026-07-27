import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';

import { getDictionary, type Locale, localizedHref } from '../_i18n/dict';
import type { Dictionary } from '../_i18n/types';
import { breadcrumbSchema, softwareApplicationSchema } from '../_schema';
import { Footer } from '../_sections/footer';
import { Header } from '../_sections/header';
import {
  classifyAsset,
  fetchLatestRelease,
  formatBytes,
  formatDate,
  type GhRelease,
  type ParsedAsset,
} from './_release';

const SITE_URL = 'https://muicv.com';

type DownloadDict = Dictionary['download'];

export async function DownloadView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.download;
  const release = await fetchLatestRelease();

  const selfHref = localizedHref(locale, '/download');
  const altHref = locale === 'zh' ? '/en/download' : '/download';
  const crumbHome = locale === 'en' ? 'Home' : '首页';
  const crumbSelf = locale === 'en' ? 'Download' : '下载';

  return (
    <div className="relative">
      <JsonLd
        data={softwareApplicationSchema({
          locale,
          description: dict.meta.download.description,
          url: `${SITE_URL}${selfHref}`,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: crumbHome, url: `${SITE_URL}${localizedHref(locale, '/')}` },
          { name: crumbSelf, url: `${SITE_URL}${selfHref}` },
        ])}
      />
      <Header locale={locale} brand={dict.brand} nav={dict.nav} altHref={altHref} />

      <main className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-yellow-deep">— {t.eyebrow}</p>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-extrabold leading-[1.05] tracking-tight">{t.title}</h1>
        <p className="mt-4 max-w-xl text-[16px] leading-[1.7] text-ink-soft">{t.lede}</p>

        <FirstMinute t={t} />

        {!release ? <NoRelease t={t} locale={locale} /> : <ReleasePanel release={release} t={t} />}

        <FirstRunHelp t={t} />
      </main>

      <Footer dict={dict} locale={locale} />
    </div>
  );
}

function FirstMinute({ t }: { t: DownloadDict }) {
  return (
    <section className="mt-10 rounded-xl border-2 border-ink bg-corgi/20 p-5 shadow-[0_4px_0_0_var(--color-yellow-shadow)]">
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-yellow-deep">
        {t.firstMinuteLabel}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {t.firstMinuteSteps.map((step, idx) => (
          <div key={step.title} className="rounded-xl border-2 border-rule bg-cream px-4 py-3">
            <span className="font-mono text-[12px] font-bold text-yellow-deep">{String(idx + 1).padStart(2, '0')}</span>
            <h2 className="mt-2 text-[14px] font-extrabold text-ink">{step.title}</h2>
            <p className="mt-1.5 text-[12px] leading-[1.6] text-ink-soft">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReleasePanel({ release, t }: { release: GhRelease; t: DownloadDict }) {
  const all = release.assets.map(classifyAsset);

  // 安装包过滤：mac 收 dmg/zip；win 收 exe；linux 收 AppImage/deb
  const assetsByKey: Record<DownloadDict['platforms'][number]['key'], ParsedAsset[]> = {
    'mac-arm64': all
      .filter((a) => a.platform === 'mac' && (a.format === 'dmg' || a.format === 'zip') && a.arch === 'arm64')
      .sort((a, b) => a.format.localeCompare(b.format)),
    'mac-x64': all
      .filter((a) => a.platform === 'mac' && (a.format === 'dmg' || a.format === 'zip') && a.arch === 'x64')
      .sort((a, b) => a.format.localeCompare(b.format)),
    win: all.filter((a) => a.platform === 'win' && a.format === 'exe'),
    linux: all.filter((a) => a.platform === 'linux' && (a.format === 'AppImage' || a.format === 'deb')),
  };

  return (
    <section className="mt-12 space-y-6">
      <div className="flex flex-wrap items-baseline gap-3 rounded-xl border-2 border-ink bg-cream px-5 py-3 shadow-[0_4px_0_0_var(--color-ink)]">
        <span className="font-mono text-[12px] font-bold tabular-nums text-yellow-deep">{release.tag_name}</span>
        <span className="text-[12px] text-mute">
          {t.releasedAt} {formatDate(release.published_at)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {t.platforms.map((p) => (
          <Platform
            key={p.key}
            title={p.title}
            subtitle={p.subtitle}
            assets={assetsByKey[p.key]}
            tag={release.tag_name}
            t={t}
          />
        ))}
      </div>

      <div className="rounded-xl border border-rule bg-paper px-4 py-3 text-[12px] text-mute">{t.unsignedNote}</div>
    </section>
  );
}

function Platform({
  title,
  subtitle,
  assets,
  tag,
  t,
}: {
  title: string;
  subtitle: string;
  assets: ParsedAsset[];
  tag: string;
  t: DownloadDict;
}) {
  return (
    <div className="rounded-xl border-2 border-ink bg-cream p-5 shadow-[0_4px_0_0_var(--color-ink)]">
      <div>
        <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
        <p className="mt-0.5 text-[12px] text-mute">{subtitle}</p>
      </div>

      <div className="mt-4 space-y-2">
        {assets.length === 0 ? (
          <p className="text-[12px] text-mute">{t.noArch}</p>
        ) : (
          assets.map((a) => (
            // 走 /api/download 代理端点：CN 用户由 Worker 流式代理 + 边缘缓存，非 CN 302 直连 GitHub。
            <a
              key={a.url}
              href={`/api/download/${encodeURIComponent(tag)}/${encodeURIComponent(a.name)}`}
              className="press flex items-center justify-between rounded-lg bg-yellow px-3.5 py-2 text-[14px] font-bold text-ink transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="font-mono uppercase">{a.format}</span>
                <span className="text-mute">·</span>
                <span className="text-ink">{t.downloadLabel}</span>
              </span>
              <span className="font-mono text-[12px] text-ink-soft">{formatBytes(a.size)}</span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function NoRelease({ t, locale }: { t: DownloadDict; locale: Locale }) {
  return (
    <section className="mt-12 rounded-xl border-2 border-rule bg-paper p-6 text-[14px] text-ink-soft">
      <p>{t.noReleaseLead}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px]">
        <li>{t.noReleaseSkill}</li>
        <li>
          {t.noReleaseContactBefore}
          <Link
            href={localizedHref(locale, '/contact')}
            className="underline decoration-corgi decoration-2 underline-offset-4 hover:text-yellow-deep"
          >
            {t.noReleaseContactLink}
          </Link>
        </li>
      </ul>
    </section>
  );
}

function FirstRunHelp({ t }: { t: DownloadDict }) {
  return (
    <section className="mt-12 space-y-6 rounded-xl border-2 border-ink bg-fluff p-6">
      <header>
        <h2 className="text-[16px] font-extrabold text-ink">{t.firstRunTitle}</h2>
        <p className="mt-2 text-[14px] leading-[1.7] text-ink-soft">{t.firstRunLede}</p>
      </header>

      <div className="space-y-1.5">
        <h3 className="text-[14px] font-bold text-ink">macOS</h3>
        <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink-soft">
          <li>{t.firstRunMacSteps[0]}</li>
          <li>{t.firstRunMacSteps[1]}</li>
          <li>{t.firstRunMacSteps[2]}</li>
        </ol>
        <p className="text-[12px] text-mute">
          {t.firstRunMacCliLabel}
          <code className="ml-1 rounded bg-cream px-1.5 py-0.5 font-mono text-[12px] text-ink">{t.firstRunMacCli}</code>
        </p>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-[14px] font-bold text-ink">Windows</h3>
        <ol className="list-decimal space-y-1 pl-5 text-[14px] text-ink-soft">
          <li>{t.firstRunWinSteps[0]}</li>
          <li>{t.firstRunWinSteps[1]}</li>
          <li>{t.firstRunWinSteps[2]}</li>
        </ol>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-[14px] font-bold text-ink">Linux</h3>
        <p className="text-[14px] text-ink-soft">{t.firstRunLinuxLede}</p>
        <pre className="overflow-x-auto rounded-lg bg-cream px-3 py-2 font-mono text-[12px] text-ink">
          <code>{`chmod +x MuiCV-*.AppImage\n./MuiCV-*.AppImage`}</code>
        </pre>
      </div>
    </section>
  );
}
