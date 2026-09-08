import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ['@muicv/shared'], include: ['electron'] })],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
    ssr: {
      external: ['electron'],
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
        '@skills': resolve(__dirname, '../../skills'),
      },
    },
    assetsInclude: ['**/*.md'],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ include: ['electron'] })],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
    ssr: {
      external: ['electron'],
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
});