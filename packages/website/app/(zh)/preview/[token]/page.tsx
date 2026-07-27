import type { Metadata } from 'next';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  assertTemplateResumeData,
  isJsonTemplateId,
  isTemplateLang,
  JSON_TEMPLATE_IDS,
  pickLang,
  type TemplateLang,
  type TemplateResumeData,
} from '@muicv/shared';

import { getCurrentSession } from '@/lib/session';

import { jsonTemplates } from '../../r/render/[token]/templates/registry';

import { PhotoSlotButton } from './photo-slot';
import PreviewToolbar from './preview-toolbar';
import styles from './preview.module.css';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/** UUID v4：8-4-4-4-12 = 36 位含连字符。 */
const TOKEN_RE = /^[0-9a-f-]{36}$/i;

type PreviewRow = {
  token: string;
  userId: string;
  resumeJson: string;
  template: string;
  lang: string;
  accent: string | null;
  shareMode: string;
  pdfCredit: number;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
};

type PreviewState =
  | { kind: 'active'; record: PreviewRow; resume: TemplateResumeData }
  | { kind: 'expired'; expiresAt: number }
  | { kind: 'revoked'; revokedAt: number }
  | { kind: 'corrupt' };

/**
 * React.cache：generateMetadata 和默认导出都要查同一份 preview，
 * 用 cache 包一层让 Next.js 在同一请求里只打一次 D1。
 *
 * 缓存 key = token（参数序列化）；env 内部读，不进 key。
 */
const loadPreview = cache(async (token: string): Promise<PreviewState | null> => {
  const { env } = await getCloudflareContext({ async: true });
  const row = await env.MUICV_DB.prepare(
    `SELECT token, userId, resumeJson, template, lang, accent, shareMode, pdfCredit, createdAt, expiresAt, revokedAt
     FROM preview WHERE token = ? LIMIT 1`,
  )
    .bind(token)
    .first<PreviewRow>();
  if (!row) return null;
  if (row.revokedAt != null) return { kind: 'revoked', revokedAt: row.revokedAt };
  if (row.expiresAt <= Date.now()) return { kind: 'expired', expiresAt: row.expiresAt };
  let resume: TemplateResumeData;
  try {
    const parsed = JSON.parse(row.resumeJson) as unknown;
    assertTemplateResumeData(parsed);
    resume = parsed;
  } catch {
    return { kind: 'corrupt' };
  }
  return { kind: 'active', record: row, resume };
});

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * 按 shareMode 决定是否允许搜索引擎索引：
 *   - `public` → robots: index / follow，附带 og 标题 / 描述方便社交分享
 *   - `link`   → noindex / nofollow（默认）
 *   - 过期 / 撤销 / 损坏的预览 → 一律 noindex（不让死链进搜索）
 *
 * 解决用户场景：用户偶尔需要把简历挂出去做 SEO / 给招聘平台爬虫看，
 * 把 token 的 shareMode 切到 public 即可，无需我们维护一个公开 listings 页。
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return { robots: { index: false, follow: false } };
  const state = await loadPreview(token);
  if (!state || state.kind !== 'active' || state.record.shareMode !== 'public') {
    return { robots: { index: false, follow: false } };
  }
  const lang: TemplateLang = isTemplateLang(state.record.lang) ? state.record.lang : 'zh';
  const name = (pickLang(state.resume.name, lang) as string) || 'Resume';
  const role = (pickLang(state.resume.title, lang) as string) || '';
  const summary = (pickLang(state.resume.summary, lang) as string) || '';
  const title = role ? `${name} · ${role}` : name;
  const description = summary.slice(0, 160);
  const url = `https://muicv.com/preview/${state.record.token}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'profile',
      title,
      description,
      url,
      siteName: 'Mui简历',
      locale: lang === 'en' ? 'en_US' : 'zh_CN',
      ...(state.resume.photoUrl ? { images: [{ url: state.resume.photoUrl }] } : {}),
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const state = await loadPreview(token);
  if (!state) notFound();

  if (state.kind === 'expired') {
    return (
      <div className={styles.statusPanel}>
        <h1>这份预览已过期</h1>
        <p>过期于 {formatDate(state.expiresAt)}。如果你是简历的拥有者，可以在桌面 app 或 dashboard 里续期。</p>
      </div>
    );
  }
  if (state.kind === 'revoked') {
    return (
      <div className={styles.statusPanel}>
        <h1>这份预览已被撤销</h1>
        <p>拥有者已经主动撤销了这条分享链接（{formatDate(state.revokedAt)}）。请联系对方获取新的链接。</p>
      </div>
    );
  }
  if (state.kind === 'corrupt') {
    return (
      <div className={styles.statusPanel}>
        <h1>预览数据损坏</h1>
        <p>数据没法解析回 TemplateResumeData。请联系拥有者重新创建一份。</p>
      </div>
    );
  }

  const { record, resume } = state;
  if (!isJsonTemplateId(record.template)) {
    return (
      <div className={styles.statusPanel}>
        <h1>未知模板</h1>
        <p>这份预览引用了我们不再支持的模板 {record.template}，请联系拥有者重新生成。</p>
      </div>
    );
  }

  const Template = jsonTemplates[record.template];
  const lang: TemplateLang = isTemplateLang(record.lang) ? record.lang : 'zh';
  const shareUrl = `https://muicv.com/preview/${record.token}`;

  const session = await getCurrentSession();
  const isOwner = session?.user?.id === record.userId;

  return (
    <>
      <PreviewToolbar
        token={record.token}
        shareUrl={shareUrl}
        shareMode={record.shareMode === 'public' ? 'public' : 'link'}
        expiresAt={record.expiresAt}
        isOwner={isOwner}
        currentTemplate={record.template}
        templateOptions={[...JSON_TEMPLATE_IDS]}
      />
      <div className={styles.stage}>
        <div className={styles.stageInner}>
          <Template
            resume={resume}
            lang={lang}
            {...(record.accent ? { accent: record.accent } : {})}
            {...(isOwner
              ? { slots: { photo: <PhotoSlotButton token={record.token} hasPhoto={!!resume.photoUrl} /> } }
              : {})}
          />
        </div>
      </div>
    </>
  );
}
