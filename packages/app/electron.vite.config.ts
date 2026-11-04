import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@muicv/shared'], include: ['electron'] })],
    build: {
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, 'src/main/index.ts') },
      },
    },
    ssr: {
      external: ['electron'],
    },
    resolve: {
      alias: {
        '@main': resolve(import.meta.dirname, 'src/main'),
        '@skills': resolve(import.meta.dirname, '../../skills'),
      },
    },
    assetsInclude: ['**/*.md'],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ include: ['electron'] })],
    build: {
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, 'src/preload/index.ts') },
      },
    },
    ssr: {
      external: ['electron'],
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src/renderer'),
        '@shared': resolve(import.meta.dirname, 'src/shared'),
      },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, 'src/renderer/index.html') },
      },
    },
  },
});
