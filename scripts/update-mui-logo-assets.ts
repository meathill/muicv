import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const requireFromApp = createRequire(new URL('../packages/app/package.json', import.meta.url));
const sharp = requireFromApp('sharp') as typeof import('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const sourcePath = '/Users/meathill/Downloads/ChatGPT Image May 19, 2026, 04_33_53 PM.png';

const outputPaths = {
  canonical: join(repoRoot, 'packages/website/public/brand/mui-logo.png'),
  appPublic: join(repoRoot, 'packages/app/src/renderer/public/brand/mui-logo.png'),
  appBuildSource: join(repoRoot, 'packages/app/build/mui-logo.png'),
  appIconPng: join(repoRoot, 'packages/app/build/icon.png'),
  websiteIconPng: join(repoRoot, 'packages/website/app/icon.png'),
};

function isOutsideBackground(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= 18 && max >= 218;
}

async function removeCheckerBackground(): Promise<Buffer> {
  const input = sharp(sourcePath).ensureAlpha();
  const metadata = await input.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('无法读取 logo 尺寸');
  }

  const width = metadata.width;
  const height = metadata.height;
  const raw = await input.raw().toBuffer();
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  function enqueue(x: number, y: number): void {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const offset = index * 4;
    if (!isOutsideBackground(raw[offset], raw[offset + 1], raw[offset + 2])) return;
    visited[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (!visited[index]) continue;
    raw[index * 4 + 3] = 0;
  }

  return sharp(raw, { raw: { width, height, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

async function writeLogoCopies(logo: Buffer): Promise<void> {
  await Promise.all([
    mkdir(dirname(outputPaths.canonical), { recursive: true }),
    mkdir(dirname(outputPaths.appPublic), { recursive: true }),
    mkdir(dirname(outputPaths.appBuildSource), { recursive: true }),
  ]);

  await Promise.all([
    writeFile(outputPaths.canonical, logo),
    writeFile(outputPaths.appPublic, logo),
    writeFile(outputPaths.appBuildSource, logo),
  ]);
}

async function writeIconPngs(logo: Buffer): Promise<void> {
  const icon = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#fdfaf2',
    },
  })
    .composite([
      {
        input: await sharp(logo).resize({ width: 820, height: 820, fit: 'inside' }).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  // 网页 favicon 用不到 1024 分辨率——之前 appIconPng / websiteIconPng 共用同一张
  // 1024 图，导致首页 favicon 有 491 KB（issue #11）。electron 端图标要多分辨率
  // 缩放，必须保留高清源图；网页端单独出一份小尺寸版本。
  const websiteIcon = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: '#fdfaf2',
    },
  })
    .composite([
      {
        input: await sharp(logo).resize({ width: 205, height: 205, fit: 'inside' }).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  await Promise.all([writeFile(outputPaths.appIconPng, icon), writeFile(outputPaths.websiteIconPng, websiteIcon)]);
}

async function writeSvgIcons(logo: Buffer): Promise<void> {
  const appDataUri = `data:image/png;base64,${logo.toString('base64')}`;
  const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="224" ry="224" fill="#fdfaf2"/>
  <image href="${appDataUri}" x="102" y="102" width="820" height="820" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;

  // 网页 favicon：内嵌图先缩到 200px 宽再编码（SVG 的 viewBox/rect/image 坐标不变，
  // 浏览器按 width="820" 缩放显示，源图分辨率不影响布局），之前直接塞原图导致
  // icon.svg 一度到 874 KB（issue #11）。
  const websiteLogo = await sharp(logo).resize({ width: 200, fit: 'inside' }).png().toBuffer();
  const websiteDataUri = `data:image/png;base64,${websiteLogo.toString('base64')}`;
  const websiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="224" ry="224" fill="#fdfaf2"/>
  <image href="${websiteDataUri}" x="102" y="102" width="820" height="820" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;

  await Promise.all([
    writeFile(join(repoRoot, 'packages/app/build/icon.svg'), appSvg),
    writeFile(join(repoRoot, 'packages/app/src/renderer/public/icon.svg'), appSvg),
    writeFile(join(repoRoot, 'packages/website/app/icon.svg'), websiteSvg),
  ]);
}

async function main(): Promise<void> {
  const logo = await removeCheckerBackground();
  await writeLogoCopies(logo);
  await writeIconPngs(logo);
  await writeSvgIcons(logo);

  console.log('logo assets updated');
  for (const path of Object.values(outputPaths)) {
    console.log(`  ${path}`);
  }
}

await main();
