import { execSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const appRoot = join(import.meta.dirname, '..');
const buildDir = join(appRoot, 'build');
const publicDir = join(appRoot, 'src/renderer/public');

const sourceSvg = join(buildDir, 'icon.svg');
const iconsetDir = join(buildDir, 'icon.iconset');
const pngOut = join(buildDir, 'icon.png');
const icnsOut = join(buildDir, 'icon.icns');
const icoOut = join(buildDir, 'icon.ico');

// macOS iconset 要求的 10 个文件名 → 像素尺寸
const iconsetSpec: Array<{ name: string; size: number }> = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
];

// Windows .ico 多分辨率
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svg = await readFile(sourceSvg);

  await rm(iconsetDir, { recursive: true, force: true });
  await mkdir(iconsetDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  // 1024 通用 PNG（BrowserWindow / Linux / dev dock）
  await sharp(svg).resize(1024, 1024).png().toFile(pngOut);

  // 各尺寸（不同 sharp 实例，避免共用 pipeline 状态）
  await Promise.all(
    iconsetSpec.map(({ name, size }) => sharp(svg).resize(size, size).png().toFile(join(iconsetDir, name))),
  );

  // Windows .ico —— sharp + png-to-ico，跨平台
  const icoBuffers = await Promise.all(icoSizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
  const icoBuf = await pngToIco(icoBuffers);
  await writeFile(icoOut, icoBuf);

  // macOS .icns 只在 darwin 上生成（iconutil 是 macOS-only）
  // 非 darwin runner 直接用仓里 commit 的 build/icon.icns
  if (process.platform === 'darwin') {
    execSync(`iconutil -c icns -o "${icnsOut}" "${iconsetDir}"`, { stdio: 'inherit' });
  }
  await rm(iconsetDir, { recursive: true, force: true });

  // 同步给 renderer 当 favicon
  await copyFile(sourceSvg, join(publicDir, 'icon.svg'));

  console.log('icons built:');
  console.log(`  ${pngOut}`);
  if (process.platform === 'darwin') {
    console.log(`  ${icnsOut}`);
  } else {
    console.log(`  ${icnsOut} (skipped on ${process.platform}, using committed copy)`);
  }
  console.log(`  ${icoOut}`);
  console.log(`  ${join(publicDir, 'icon.svg')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
