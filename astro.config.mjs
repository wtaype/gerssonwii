// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { linkweb } from './src/wii.js';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },

  site: linkweb,
  base: '/',
  compressHTML: true,

  // 🚀 0 ARCHIVOS .CSS: Inlining directo de todos los estilos críticos en el HTML
  build: {
    inlineStylesheets: 'always'
  },
  image: {
    service: passthroughImageService()
  },

  // ⚡ BUNDLING VITE & ROLLUP (Unificación en app.[hash].js)
  vite: {
    build: {
      target: 'esnext',
      minify: true,
      cssMinify: true,
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          entryFileNames(chunkInfo) {
            if (chunkInfo.name.includes('ClientRouter')) {
              return '_astro/ClientRouter.[hash].js';
            }
            return '_astro/app.[hash].js';
          },
          chunkFileNames(chunkInfo) {
            if (chunkInfo.name.includes('ClientRouter')) {
              return '_astro/ClientRouter.[hash].js';
            }
            if (chunkInfo.name.includes('vendor-firebase')) {
              return '_astro/vendor-firebase.[hash].js';
            }
            return '_astro/app.[hash].js';
          },
          manualChunks(id) {
            const norm = id.replace(/\\/g, '/');
            if (norm.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'firebase/app',
        'firebase/firestore',
        'firebase/database'
      ]
    }
  },

  // 🗜️ HOOK DE MINIFICACIÓN EXTREMA DE HTML Y SCRIPTS INLINE
  integrations: [
    {
      name: 'minify-html-critical',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const distDir = fileURLToPath(dir);
          const getHtmlFiles = (dirPath) => fs.readdirSync(dirPath, { withFileTypes: true })
            .flatMap(e => e.isDirectory()
              ? getHtmlFiles(path.join(dirPath, e.name))
              : e.name.endsWith('.html') ? [path.join(dirPath, e.name)] : []
            );

          const minijs = (js) => js
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .map(l => l.replace(/(?:^|[^:])\/\/.*$/, '').trim())
            .filter(Boolean)
            .join(' ');

          const minihtml = (html) => html
            .replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (m, a, c) => a.includes('src=') ? m : `<script${a}>${minijs(c)}</script>`)
            .replace(/\n\s*/g, '')
            .replace(/>\s+</g, '><')
            .replace(/\s{2,}/g, ' ')
            .replace(/<!--.*?-->/g, '')
            .trim();

          for (const file of getHtmlFiles(distDir)) {
            fs.writeFileSync(file, minihtml(fs.readFileSync(file, 'utf-8')), 'utf-8');
          }
        }
      }
    }
  ]
});
