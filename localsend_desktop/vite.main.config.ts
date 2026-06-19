import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    emptyOutDir: true,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        'electron',
        'electron-store',
        'dgram',
        'os',
        'crypto',
        'fs',
        'path',
        'net',
        'http',
        'bufferutil',
        'utf-8-validate',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
    },
  },
});