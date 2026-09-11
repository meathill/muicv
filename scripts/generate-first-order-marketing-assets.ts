import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const requireFromApp = createRequire(new URL('../packages/app/package.json', import.meta.url));
const sharp = requireFromApp('sharp') as typeof import('sharp');

const OUT_DIR = new URL('../docs/marketing/first-order/', import.meta.url);
const LOGO_URL = new URL('../packages/website/public/brand/mui-logo.png', import.meta.url);

type Size = {
  width: number;
  height: number;
};

type Asset = Size & {
  name: string;
  svg: string;
};

const COLORS = {
  cream: '#fff5dc',
  fluff: '#fffaf0',
  yellow: '#ffd34d',
  yellowDeep: '#a76500',
  ink: '#2b2118',
  inkSoft: '#66513f',
  rule: '#d8b56b',
  green: '#7f9d5b',
  red: '#d76346',
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function textBlock(lines: string[], x: number, y: number, options: { size: number; weight?: number; color?: string; lineHeight?: number }): string {
  const weight = options.weight ?? 700;
  const color = options.color ?? COLORS.ink;
  const lineHeight = options.lineHeight ?? Math.round(options.size * 1.25);

  return `<text x="${x}" y="${y}" font-size="${options.size}" font-weight="${weight}" fill="${color}">
${lines
  .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
  .join('\n')}
</text>`;
}

function shell({ width, height }: Size, body: string): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="${width}" height="${height}" fill="${COLORS.cream}"/>
<radialGradient id="sun" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(${width * 0.72} ${height * 0.18}) rotate(112) scale(${width * 0.55} ${height * 0.34})">
  <stop stop-color="${COLORS.yellow}" stop-opacity="0.75"/>
  <stop offset="1" stop-color="${COLORS.yellow}" stop-opacity="0"/>
</radialGradient>
<rect width="${width}" height="${height}" fill="url(#sun)"/>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
  <path d="M48 0H0V48" stroke="${COLORS.rule}" stroke-opacity="0.28" stroke-width="2"/>
</pattern>
<rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.5"/>
<style>
  text { font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; letter-spacing: 0; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
</style>
${body}
</svg>`;
}

function pressRect(x: number, y: number, width: number, height: number, fill: string, stroke = COLORS.ink, shadow = 12): string {
  return `<rect x="${x + shadow}" y="${y + shadow}" width="${width}" height="${height}" rx="14" fill="${COLORS.ink}"/>
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
}

function muiLogo(dataUri: string, x: number, y: number, width: number, height: number): string {
  return `<image href="${dataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
}

function xhsCover(dataUri: string): Asset {
  const width = 1080;
  const height = 1440;
  const body = `
${pressRect(72, 72, 936, 1296, COLORS.fluff)}
<text class="mono" x="112" y="162" font-size="26" font-weight="800" fill="${COLORS.yellowDeep}">MUI CV / FIRST ORDER</text>
<rect x="112" y="206" width="232" height="54" rx="27" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="4"/>
<text x="142" y="242" font-size="26" font-weight="900" fill="${COLORS.ink}">2026.05.18</text>
${muiLogo(dataUri, 742, 120, 226, 148)}
${textBlock(['第一单', '来了'], 112, 456, { size: 154, weight: 900, lineHeight: 170 })}
<path d="M112 804H696" stroke="${COLORS.yellow}" stroke-width="34" stroke-linecap="round"/>
<text x="112" y="828" font-size="70" font-weight="900" fill="${COLORS.ink}">钱没到账</text>
${textBlock(['但我很开心。'], 112, 946, { size: 78, weight: 900 })}
<rect x="112" y="1058" width="856" height="150" rx="14" fill="${COLORS.cream}" stroke="${COLORS.rule}" stroke-width="3" stroke-dasharray="10 10"/>
${textBlock(['第一次有人走到', '“我愿意为这个工具付费”。'], 150, 1122, { size: 36, weight: 800, color: COLORS.inkSoft, lineHeight: 52 })}
<text x="112" y="1288" font-size="32" font-weight="900" fill="${COLORS.ink}">Mui 简历</text>
<text x="112" y="1338" font-size="28" font-weight="700" fill="${COLORS.inkSoft}">陪你走完整个求职周期</text>
`;

  return { name: 'xhs-cover-first-order', width, height, svg: shell({ width, height }, body) };
}

function xhsFlow(dataUri: string): Asset {
  const width = 1080;
  const height = 1440;
  const steps = [
    ['01', '整理职业素材', '把经历拆成可复用、可追溯的事实。'],
    ['02', '制作求职材料', '简历、求职信和岗位版本都从素材长出来。'],
    ['03', '模拟面试', '围绕目标岗位练项目、行为问题和追问。'],
    ['04', '面试复盘', '把问题、表现和遗漏点沉淀下来。'],
    ['05', 'Offer / 入职', '比较机会，制定入职后的 30/60/90 天计划。'],
  ];

  const cards = steps
    .map(([no, title, desc], index) => {
      const y = 300 + index * 190;
      return `${pressRect(94, y, 892, 136, index === 0 ? COLORS.yellow : COLORS.fluff, COLORS.ink, 8)}
<text class="mono" x="132" y="${y + 58}" font-size="30" font-weight="900" fill="${COLORS.yellowDeep}">${no}</text>
<text x="214" y="${y + 58}" font-size="38" font-weight="900" fill="${COLORS.ink}">${title}</text>
<text x="214" y="${y + 106}" font-size="24" font-weight="700" fill="${COLORS.inkSoft}">${desc}</text>`;
    })
    .join('\n');

  const body = `
${textBlock(['不只是', '生成简历'], 86, 132, { size: 68, weight: 900, lineHeight: 80 })}
<text x="86" y="262" font-size="31" font-weight="800" fill="${COLORS.inkSoft}">它陪你走完整个求职周期。</text>
${muiLogo(dataUri, 760, 92, 216, 140)}
${cards}
<rect x="86" y="1270" width="908" height="74" rx="14" fill="${COLORS.ink}"/>
<text x="128" y="1318" font-size="30" font-weight="900" fill="${COLORS.cream}">下载：muicv.com/download</text>
`;

  return { name: 'xhs-flow-material-library', width, height, svg: shell({ width, height }, body) };
}

function wideFirstOrder(dataUri: string): Asset {
  const width = 1600;
  const height = 900;
  const body = `
${pressRect(76, 74, 1448, 752, COLORS.fluff)}
<text class="mono" x="136" y="158" font-size="25" font-weight="900" fill="${COLORS.yellowDeep}">BUILDING MUI CV IN PUBLIC</text>
${muiLogo(dataUri, 1260, 120, 196, 128)}
${textBlock(['Mui 简历', '出了第一单'], 136, 306, { size: 104, weight: 900, lineHeight: 116 })}
<path d="M136 556H620" stroke="${COLORS.yellow}" stroke-width="28" stroke-linecap="round"/>
<text x="136" y="578" font-size="52" font-weight="900" fill="${COLORS.ink}">虽然钱没收到</text>
<text x="136" y="660" font-size="39" font-weight="800" fill="${COLORS.inkSoft}">但有人愿意为 AI 求职陪跑付费。</text>
<rect x="136" y="720" width="352" height="58" rx="14" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="4"/>
<text x="164" y="758" font-size="26" font-weight="900" fill="${COLORS.ink}">muicv.com/download</text>
${pressRect(950, 188, 438, 514, COLORS.cream, COLORS.ink, 10)}
<text x="1000" y="258" font-size="30" font-weight="900" fill="${COLORS.ink}">订单信号</text>
<rect x="1000" y="304" width="338" height="72" rx="12" fill="${COLORS.yellow}"/>
<text x="1028" y="350" font-size="34" font-weight="900" fill="${COLORS.ink}">愿意付费</text>
<path d="M1002 430H1338" stroke="${COLORS.rule}" stroke-width="4" stroke-dasharray="10 10"/>
<text x="1000" y="494" font-size="28" font-weight="800" fill="${COLORS.inkSoft}">产品意义 &gt; 金额</text>
<text x="1000" y="556" font-size="28" font-weight="800" fill="${COLORS.inkSoft}">完整求职周期</text>
<text x="1000" y="618" font-size="28" font-weight="800" fill="${COLORS.inkSoft}">继续打磨面试和复盘</text>
`;

  return { name: 'wide-first-order', width, height, svg: shell({ width, height }, body) };
}

function blogHero(dataUri: string): Asset {
  const width = 1600;
  const height = 840;
  const body = `
<rect x="0" y="0" width="1600" height="840" fill="${COLORS.cream}"/>
<circle cx="1260" cy="150" r="220" fill="${COLORS.yellow}" opacity="0.55"/>
<circle cx="1380" cy="620" r="180" fill="${COLORS.green}" opacity="0.18"/>
${pressRect(84, 80, 1432, 680, COLORS.fluff)}
<text class="mono" x="152" y="178" font-size="24" font-weight="900" fill="${COLORS.yellowDeep}">MUI 简历 · 里程碑记录</text>
${muiLogo(dataUri, 1234, 126, 224, 146)}
${textBlock(['第一单来了，', '虽然钱没收到'], 152, 330, { size: 92, weight: 900, lineHeight: 108 })}
<text x="152" y="588" font-size="38" font-weight="800" fill="${COLORS.inkSoft}">第一笔订单最重要的不是收入，而是信号。</text>
<text x="152" y="654" font-size="30" font-weight="800" fill="${COLORS.inkSoft}">有人真的需要一个从简历到入职都能陪跑的 AI 求职平台。</text>
<rect x="1136" y="540" width="254" height="72" rx="14" fill="${COLORS.yellow}" stroke="${COLORS.ink}" stroke-width="4"/>
<text x="1174" y="587" font-size="30" font-weight="900" fill="${COLORS.ink}">继续打磨</text>
`;

  return { name: 'blog-hero-first-order', width, height, svg: shell({ width, height }, body) };
}

async function renderAsset(asset: Asset): Promise<void> {
  const svgPath = join(OUT_DIR.pathname, `${asset.name}.svg`);
  const pngPath = join(OUT_DIR.pathname, `${asset.name}.png`);
  await writeFile(svgPath, asset.svg, 'utf8');
  await sharp(Buffer.from(asset.svg)).png().toFile(pngPath);
  console.log(`${asset.name}: ${asset.width}x${asset.height}`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const logo = await readFile(LOGO_URL);
  const dataUri = `data:image/png;base64,${logo.toString('base64')}`;
  const assets = [xhsCover(dataUri), xhsFlow(dataUri), wideFirstOrder(dataUri), blogHero(dataUri)];
  for (const asset of assets) {
    await renderAsset(asset);
  }
}

await main();
