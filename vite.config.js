import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for local filesystem and static hosting (GitHub Pages)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (normalizedId.includes('plotly.js-basic-dist')) {
            return 'plotly';
          }
          if (normalizedId.includes('html2pdf.js')) {
            return 'html2pdf';
          }
          if (normalizedId.includes('gsap')) {
            return 'gsap';
          }
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'tests/**', 'eslint.config.js', 'vite.config.js'],
      thresholds: {
        statements: 60,
        branches: 48,
        functions: 45,
        lines: 60
      }
    }
  }
});
