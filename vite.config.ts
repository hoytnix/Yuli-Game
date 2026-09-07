import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@wllama/wllama/esm/wasm/wllama.wasm',
          dest: 'wllama',
        },
        {
          src: 'node_modules/wa-sqlite/dist/wa-sqlite-async.wasm',
          dest: 'sqlite',
        },
        {
          src: 'node_modules/wa-sqlite/dist/wa-sqlite.wasm',
          dest: 'sqlite',
        },
      ],
    }),
  ],
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@wllama/wllama', 'wa-sqlite'],
  },
});
