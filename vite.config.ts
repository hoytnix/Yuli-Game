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
    proxy: {
      '/models/yuli.gguf': {
        target: 'https://github.com/hoytnix/Yuli-Game/releases/download/v0.1.0/yuli-0.1.0-e2b.Q4_K_M.gguf',
        changeOrigin: true,
        followRedirects: true,
        rewrite: () => '',
      },
    },
  },
  preview: {
    port: 4173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/models/yuli.gguf': {
        target: 'https://github.com/hoytnix/Yuli-Game/releases/download/v0.1.0/yuli-0.1.0-e2b.Q4_K_M.gguf',
        changeOrigin: true,
        followRedirects: true,
        rewrite: () => '',
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@wllama/wllama', 'wa-sqlite'],
  },
});
