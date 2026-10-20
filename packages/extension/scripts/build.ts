import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { zipSync } from 'fflate';
import { build } from 'vite';

import { LOCALE_MESSAGES, toChromeMessages } from '../src/i18n.ts';

/**
 * 构建扩展：vite 打 popup / inject 两个 IIFE → 生成 _locales → 可选打包。
 *   node scripts/build.ts            开发构建（未压缩，dist/）
 *   node scripts/build.ts --release  生产构建（压缩）+ release/muicv-extension-<ver>.zip（Chrome / Edge）
 *                                    + release/muicv-extension-<ver>-firefox.zip（AMO，补 gecko 设置）
 */

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const release = process.argv.includes('--release');
const entries = ['popup', 'inject'] as const;

await rm(dist, { recursive: true, force: true });

for (const name of entries) {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    publicDir: name === 'popup' ? resolve(root, 'public') : false,
    build: {
      outDir: dist,
      emptyOutDir: false,
      minify: release,
      rollupOptions: {
        input: { [name]: resolve(root, `src/${name}.ts`) },
        output: {
          format: 'iife',
          name: `muicv_${name}`,
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
        },
      },
    },
  });
}

for (const [locale, flat] of Object.entries(LOCALE_MESSAGES)) {
  await mkdir(join(dist, '_locales', locale), { recursive: true });
  await writeFile(
    join(dist, '_locales', locale, 'messages.json'),
    `${JSON.stringify(toChromeMessages(flat), null, 2)}\n`,
  );
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

async function zipDist(target: string, patchManifest?: (m: Record<string, unknown>) => void): Promise<void> {
  const files: Record<string, Uint8Array> = {};
  for (const file of await listFiles(dist)) {
    const rel = relative(dist, file).split('\\').join('/');
    let data = new Uint8Array(await readFile(file));
    if (rel === 'manifest.json' && patchManifest) {
      const manifest = JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
      patchManifest(manifest);
      data = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
    }
    files[rel] = data;
  }
  await writeFile(target, zipSync(files, { level: 9 }));
  console.log(`packed ${relative(root, target)}`);
}

if (release) {
  const manifest = JSON.parse(await readFile(join(dist, 'manifest.json'), 'utf8')) as { version: string };
  await mkdir(resolve(root, 'release'), { recursive: true });
  await zipDist(resolve(root, 'release', `muicv-extension-${manifest.version}.zip`));
  await zipDist(resolve(root, 'release', `muicv-extension-${manifest.version}-firefox.zip`), (m) => {
    m.browser_specific_settings = {
      gecko: {
        id: 'extension@muicv.com',
        strict_min_version: '128.0',
        data_collection_permissions: { required: ['websiteContent', 'authenticationInfo'] },
      },
    };
  });
}
