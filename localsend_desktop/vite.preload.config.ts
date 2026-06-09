import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/preload',
    emptyOutDir: true,
    lib: {
      entry: 'src/preload/preload.ts',
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
    },
  },
});