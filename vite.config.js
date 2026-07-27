import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// js/*.js are loaded as plain classic <script src> tags (not `type="module"`),
// so Vite's bundler leaves them untouched and never copies them into dist/.
// Copy the folder verbatim after build so `vite preview` / static hosting
// keeps working exactly like the current no-build deploy.
function copyJsDir() {
  return {
    name: 'copy-js-dir',
    closeBundle() {
      fs.cpSync(path.resolve(__dirname, 'js'), path.resolve(__dirname, 'dist/js'), { recursive: true });
    },
  };
}

// Phase 1A — Vite added as a layer on top of the existing classic-script app.
// index.html, js/ and css/ are untouched; this just gives us a dev server
// with HMR/full-reload and a build step, without turning the app into an
// ES module bundle yet.
export default defineConfig({
  root: __dirname,
  plugins: [copyJsDir()],
  resolve: {
    alias: {
      '@js': path.resolve(__dirname, 'js'),
    },
  },
  server: {
    open: false,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
