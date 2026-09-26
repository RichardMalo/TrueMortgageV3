import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function swVersionPlugin() {
  return {
    name: 'sw-version-stamper',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8');
        const stamp = `truemortgage-v3-${Date.now()}`;
        content = content.replace(
          /const CACHE_NAME = ['"][^'"]+['"];/,
          `const CACHE_NAME = '${stamp}';`
        );
        fs.writeFileSync(swPath, content, 'utf-8');
      }
    }
  };
}

export default defineConfig({
  plugins: [swVersionPlugin()],
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
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'src/js/index.ts',
        'eslint.config.js',
        'vite.config.js'
      ],
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 60,
        lines: 70
      }
    }
  }
});
