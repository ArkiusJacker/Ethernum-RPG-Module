import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: 'scripts/ethernum.js',
      output: {
        format: 'es',
        entryFileNames: 'scripts/ethernum.js',
        chunkFileNames: 'scripts/[name].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'templates', dest: '.' },
        { src: 'styles', dest: '.' },
        { src: 'assets', dest: '.' },
        { src: 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', dest: 'scripts' },
        { src: 'node_modules/pdfjs-dist/LICENSE', dest: 'licenses', rename: 'pdfjs-dist-LICENSE' },
        { src: 'lang', dest: '.' },
        { src: 'module.json', dest: '.' },
        { src: 'LICENSE', dest: '.' },
        { src: 'README.md', dest: '.' },
        { src: 'CHANGELOG.md', dest: '.' },
      ],
    }),
  ],
}));
