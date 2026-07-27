import { ImageResponse } from 'next/og';
import { POST_SECTION_META, type PostSection } from '@muicv/shared';
import { getWebsitePostBySlug } from '@/lib/cms-content';
import { loadGoogleFontSubsets } from '@/lib/og-font';

/**
 * 每篇文章生成定制 OG 卡：标题 + 板块 + 作者/日期 + 品牌。
 * 字体走 Google Fonts CSS API 按标题文本子集化，~5-10 KB 一张图，能撑住 CJK。
 */

export const alt = 'Mui简历 文章分享';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// 文章每小时重新生成一次足够；命中后由 Next.js 缓存层服务
export const revalidate = 3600;

type Params = { section: string; slug: string };

function isPostSection(value: string): value is PostSection {
  return value === 'jobs' || value === 'product' || value === 'guide';
}

export default async function Image({ params }: { params: Promise<Params> }) {
  try {
    const { section, slug } = await params;
    if (!isPostSection(section)) return fallbackImage();
    const post = await getWebsitePostBySlug(section, slug);
    if (!post) return fallbackImage();

    const sectionMeta = POST_SECTION_META[post.section];
    // 把所有要显示的中文/英文拼起来，让 Google Fonts API 只下载这些字符
    const subsetText = `${post.title}${sectionMeta.label}Mui简历${post.author}${post.publishedAt}文章分享`;
    const fonts = await loadGoogleFontSubsets('Noto+Sans+SC', [800, 500], subsetText);

    // 没拿到字体直接走 ASCII 兜底：Satori 在 CJK 文本上找不到 glyph 会抛异常 → 500。
    // Cloudflare Workers 偶发对 fonts.googleapis.com 子请求受限/CPU 紧张，这条保命。
    if (fonts.length === 0) {
      console.warn('[og/posts] Noto Sans SC subset 未拉到，走 ASCII fallback');
      return fallbackImage();
    }

    // 关键：ImageResponse 内部 lazy render，Satori 抛错会在我们 return 之后才发生
    // —— 此时 try/catch 已经退栈，CF Worker 直接 1101。所以这里强制 eager 渲染：
    // .arrayBuffer() 会拉完整个流，若 Satori 在那里抛我们能在这里抓到。
    const res = renderPostImage({ post, sectionLabel: sectionMeta.label, fonts });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('[og/posts] 生成异常', err);
    return fallbackImage();
  }
}

function renderPostImage({
  post,
  sectionLabel,
  fonts,
}: {
  post: { title: string; author: string; publishedAt: string };
  sectionLabel: string;
  fonts: Awaited<ReturnType<typeof loadGoogleFontSubsets>>;
}) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFF6E3',
        color: '#1F1A14',
        padding: '72px 88px',
        position: 'relative',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      {/* 顶部：品牌 + 板块 badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#1F1A14',
            letterSpacing: -0.5,
          }}
        >
          Mui简历
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 18px',
            background: '#FFD23F',
            border: '3px solid #1F1A14',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 800,
            color: '#1F1A14',
            boxShadow: '0 3px 0 0 #1F1A14',
          }}
        >
          {sectionLabel}
        </div>
      </div>

      {/* 中部：标题（最大占用） */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          marginTop: 28,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: post.title.length > 22 ? 60 : 76,
            fontWeight: 800,
            color: '#1F1A14',
            lineHeight: 1.18,
            letterSpacing: -1,
            maxWidth: 1024,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.title}
        </div>
      </div>

      {/* 底部：作者 + 日期 + 品牌脚标 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: 24,
          borderTop: '2px solid #1F1A14',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 500, color: '#3F3527' }}>{post.author}</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#7A6242',
              letterSpacing: 1.5,
            }}
          >
            {post.publishedAt.slice(0, 10)}
          </div>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#7A6242',
            letterSpacing: 2,
          }}
        >
          muicv.com
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}

/** Google Fonts 抓取失败或参数非法时的兜底：ASCII 极简版，不会出豆腐块。 */
function fallbackImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFF6E3',
        color: '#1F1A14',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 144, fontWeight: 900 }}>MuiCV</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#7A6242', marginTop: 24 }}>AI Job Search Platform</div>
    </div>,
    { ...size },
  );
}
