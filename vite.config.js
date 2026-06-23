import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Relative paths for local filesystem and static hosting (GitHub Pages)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('plotly.js-basic-dist')) {
            return 'plotly';
          }
          if (id.includes('html2pdf.js')) {
            return 'html2pdf';
          }
          if (id.includes('gsap')) {
            return 'gsap';
          }
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'src/js/ui.ts',
        'src/js/charts.ts',
        'src/js/table.ts',
        'src/js/sandbox.ts',
        'src/js/index.ts',
        'eslint.config.js',
        'vite.config.js'
      ],
      thresholds: {
        statements: 65,
        branches: 50,
        functions: 65,
        lines: 65
      }
    }
  }
});
