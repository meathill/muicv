import { getCloudflareContext } from '@opennextjs/cloudflare';
import { notFound } from 'next/navigation';

import {
  assertTemplateResumeData,
  isJsonTemplateId,
  isTemplateLang,
  type TemplateLang,
  type TemplateResumeData,
} from '@muicv/shared';

import { parseResume } from '@/lib/render/parse-resume';

import { jsonTemplates, markdownTemplates } from './templates/registry';

/** force-dynamic：每次请求都走 KV，不走 ISR / 静态缓存。 */
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type StoredMarkdown = {
  kind?: 'markdown';
  markdown: string;
  template?: string;
};

type StoredJson = {
  kind: 'json';
  resume: TemplateResumeData;
  template: string;
  lang?: string;
  accent?: string;
};

type StoredResume = StoredMarkdown | StoredJson;

const KV_KEY_PREFIX = 'resume:';
/** UUID v4：8-4-4-4-12 = 36 位含连字符。 */
const TOKEN_RE = /^[0-9a-f-]{36}$/i;

/**
 * Cloudflare KV 是最终一致：packages/api 写完 token 立即触发 puppeteer.goto，
 * 但本 worker 跨 region 读时 propagation 可能还没到，会把简历误判成 404。
 * 实测短延迟内重试就能命中，用累进 delay 限制最差情况下增加的耗时。
 */
const KV_RETRY_DELAYS_MS = [0, 200, 500] as const;

async function readStoredResume(env: CloudflareEnv, token: string): Promise<string | null> {
  for (const delay of KV_RETRY_DELAYS_MS) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const raw = await env.MUICV_KV.get(`${KV_KEY_PREFIX}${token}`);
    if (raw) return raw;
  }
  return null;
}

function parseStored(raw: string): StoredResume | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.kind === 'json' && parsed.resume && typeof parsed.template === 'string') {
      // 不抛错，让外层选择 default 兜底；这里抛会让浏览器看到 500 而不是降级渲染。
      try {
        assertTemplateResumeData(parsed.resume);
      } catch {
        return null;
      }
      return {
        kind: 'json',
        resume: parsed.resume as TemplateResumeData,
        template: parsed.template,
        ...(typeof parsed.lang === 'string' ? { lang: parsed.lang } : {}),
        ...(typeof parsed.accent === 'string' ? { accent: parsed.accent } : {}),
      };
    }
    if (typeof parsed.markdown === 'string' && parsed.markdown.trim()) {
      return {
        kind: 'markdown',
        markdown: parsed.markdown,
        ...(typeof parsed.template === 'string' ? { template: parsed.template } : {}),
      };
    }
  } catch {}
  return null;
}

export default async function RenderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const { env } = await getCloudflareContext({ async: true });
  const raw = await readStoredResume(env, token);
  if (!raw) notFound();

  const stored = parseStored(raw);
  if (!stored) notFound();

  if (stored.kind === 'json') {
    const tplName = isJsonTemplateId(stored.template) ? stored.template : null;
    if (!tplName) notFound();
    const Template = jsonTemplates[tplName];
    const lang: TemplateLang = isTemplateLang(stored.lang) ? stored.lang : 'zh';
    return <Template resume={stored.resume} lang={lang} {...(stored.accent ? { accent: stored.accent } : {})} />;
  }

  const resume = await parseResume(stored.markdown);
  // markdown 路径只支持 default；旧 client 可能传别的 template 名，统一回退到 default。
  const Template = markdownTemplates.default;
  return <Template resume={resume} />;
}
