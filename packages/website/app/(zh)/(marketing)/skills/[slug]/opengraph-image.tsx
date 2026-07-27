import { ImageResponse } from 'next/og';
import { getWebsiteSkillBySlug } from '@/lib/cms-content';
import { loadGoogleFontSubsets } from '@/lib/og-font';

/**
 * Skill 详情专属 OG：标题 + publisher + 分发模式 + 品牌。
 * 视觉上和文章 OG 同款品牌色，徽章颜色用 ink 反白，避免和板块徽章混淆。
 */

export const alt = 'Mui简历 Skill';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

type Params = { slug: string };

const DISTRIBUTION_LABEL: Record<string, string> = {
  built_in: 'MuiCV 内置',
  hosted: 'MuiCV 托管',
  external_direct: '官方直连',
  link_only: '来源索引',
};

export default async function Image({ params }: { params: Promise<Params> }) {
  try {
    const { slug } = await params;
    const skill = await getWebsiteSkillBySlug(slug);
    if (!skill) return fallbackImage();

    const distributionLabel = DISTRIBUTION_LABEL[skill.distributionMode] ?? skill.distributionMode;
    const subsetText = `${skill.title}${skill.publisher}${distributionLabel}Mui简历Skill`;
    const fonts = await loadGoogleFontSubsets('Noto+Sans+SC', [800, 500], subsetText);

    // 字体没拿到就走 ASCII 兜底：Satori 在 CJK 文本上找不到 glyph 会抛异常 → 500。
    if (fonts.length === 0) {
      console.warn('[og/skills] Noto Sans SC subset 未拉到，走 ASCII fallback');
      return fallbackImage();
    }

    // ImageResponse lazy render，Satori 在 stream 阶段抛错会绕过 try/catch → 1101。
    // .arrayBuffer() 把渲染拉到这里，异常我们才抓得住。
    const res = renderSkillImage({ skill, distributionLabel, fonts });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('[og/skills] 生成异常', err);
    return fallbackImage();
  }
}

function renderSkillImage({
  skill,
  distributionLabel,
  fonts,
}: {
  skill: { title: string; publisher: string };
  distributionLabel: string;
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
      {/* 顶部：品牌 + Skill badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1F1A14', letterSpacing: -0.5 }}>Mui简历</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 18px',
            background: '#1F1A14',
            border: '3px solid #1F1A14',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 800,
            color: '#FFD23F',
            boxShadow: '0 3px 0 0 #7A6242',
          }}
        >
          Skill · {distributionLabel}
        </div>
      </div>

      {/* 中部：Skill 标题 */}
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
            fontSize: skill.title.length > 22 ? 60 : 76,
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
          {skill.title}
        </div>
      </div>

      {/* 底部：publisher + 品牌脚标 */}
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
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#7A6242',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Publisher
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1F1A14' }}>{skill.publisher}</div>
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
      <div style={{ fontSize: 36, fontWeight: 700, color: '#7A6242', marginTop: 24 }}>Skills</div>
    </div>,
    { ...size },
  );
}
