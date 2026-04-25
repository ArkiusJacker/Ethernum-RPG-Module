import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
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
        { src: 'lang', dest: '.' },
        { src: 'module.json', dest: '.' },
        { src: 'LICENSE', dest: '.' },
        { src: 'README.md', dest: '.' },
        { src: 'CHANGELOG.md', dest: '.' },
      ],
    }),
  ],
});
