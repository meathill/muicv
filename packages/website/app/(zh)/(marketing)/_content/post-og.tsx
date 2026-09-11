import { ImageResponse } from 'next/og';
import { loadGoogleFontSubsets } from '@/lib/og-font';

export const OG_SIZE = { width: 1200, height: 630 };

type OgPost = { title: string; author: string; publishedAt: string; bodyMarkdown?: string };

/**
 * 文章 OG 卡渲染。中文 / 多语言路由共用，避免两份 Satori 布局漂移。
 * 字体按标题文本子集化（~5-10 KB 一张），拿不到字体时回 ASCII 兜底，避免 CJK 豆腐块 / 500。
 */
export async function renderPostOgImage({
  post,
  sectionLabel,
  brandName,
  shareLabel,
  fontFamily,
}: {
  post: OgPost;
  sectionLabel: string;
  brandName: string;
  shareLabel: string;
  fontFamily: string;
}): Promise<Response> {
  try {
    const subsetText = `${post.title}${sectionLabel}${brandName}${post.author}${post.publishedAt}${shareLabel}`;
    const fonts = await loadGoogleFontSubsets(fontFamily, [800, 500], subsetText);

    if (fonts.length === 0) {
      console.warn('[og/posts] 字体子集未拉到，走 ASCII fallback');
      return asciiFallback();
    }

    // Satori 是 lazy render，强制 eager 拉完流以便在此捕获异常。
    const res = renderCard({ post, sectionLabel, brandName, fonts });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('[og/posts] 生成异常', err);
    return asciiFallback();
  }
}

function renderCard({
  post,
  sectionLabel,
  brandName,
  fonts,
}: {
  post: OgPost;
  sectionLabel: string;
  brandName: string;
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
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1F1A14', letterSpacing: -0.5 }}>{brandName}</div>
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: 28, marginBottom: 28 }}>
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: 24,
          borderTop: '2px solid #1F1A14',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#3F3527' }}>{post.author}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#7A6242', letterSpacing: 1.5 }}>
            {post.publishedAt.slice(0, 10)}
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#7A6242', letterSpacing: 2 }}>muicv.com</div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}

function asciiFallback() {
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
    { ...OG_SIZE },
  );
}
