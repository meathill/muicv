import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const entries = ['background', 'content', 'popup'] as const;

await rm(resolve(root, 'dist'), { recursive: true, force: true });

for (const name of entries) {
  await build({
    root,
    configFile: false,
    publicDir: name === 'background' ? resolve(root, 'public') : false,
    build: {
      outDir: resolve(root, 'dist'),
      emptyOutDir: false,
      minify: false,
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
