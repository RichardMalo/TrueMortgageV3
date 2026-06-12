import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for local filesystem and static hosting (GitHub Pages)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild'
  }
});
