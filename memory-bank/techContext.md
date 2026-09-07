# Tech Context: Project Yuli

## Technology Stack & Core Dependencies
- **UI Framework & Runtime**: React 19 (`react` 19.2.8, `react-dom` 19.2.8)
- **Language**: TypeScript 7.0.2
- **Build Tool**: Vite 8.2.2 with `@vitejs/plugin-react` and `vite-plugin-static-copy`
- **Styling**: Tailwind CSS 3.4.19, PostCSS 8.5.28, Autoprefixer 10.5.5, `clsx`, `tailwind-merge`
- **Animation & Visuals**: `framer-motion` 13.2.0, `canvas-confetti` 1.9.4, `lucide-react` 1.41.0
- **Neural Inference**: `@wllama/wllama` 3.6.1 (WebGPU acceleration, multi-threaded WebAssembly)
- **Local Persistence**: `wa-sqlite` 1.0.0 (Asynchronous SQLite over Origin Private File System)
- **Package Manager**: `pnpm`

## Cross-Origin Isolation Requirements
WebAssembly multi-threading, `SharedArrayBuffer`, and high-performance WebGPU buffers require strict cross-origin isolation. Development and preview servers in `vite.config.ts` configure the mandatory HTTP response headers:
```typescript
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}
```
Any production host, reverse proxy, or static server must enforce these identical headers.

## Static Asset & WASM Distribution
`vite-plugin-static-copy` stages WASM binaries from `node_modules` into public distribution targets:
- `node_modules/@wllama/wllama/esm/wasm/wllama.wasm` -> `dist/wllama/`
- `node_modules/wa-sqlite/dist/wa-sqlite-async.wasm` -> `dist/sqlite/`
- `node_modules/wa-sqlite/dist/wa-sqlite.wasm` -> `dist/sqlite/`

The Web Workers locate these WASM modules at runtime via:
- `${self.location.origin}/wllama/wllama.wasm`
- `${self.location.origin}/sqlite/wa-sqlite-async.wasm`

## Browser Storage & Persistence Guarantees
- OPFS (`navigator.storage.getDirectory()`) provides synchronous access handles in Web Workers for near-native SQLite I/O performance.
- Storage Persistence (`navigator.storage.persist()`): Required to protect SQLite ledgers and multi-gigabyte GGUF model caches from mobile browser eviction under storage pressure.

## Development & Build CLI Commands
- **Install Dependencies**: `pnpm install`
- **Typecheck**: `pnpm exec tsc --noEmit`
- **Development Server**: `pnpm dev --host 0.0.0.0 --port 5173`
- **Production Build**: `pnpm build` (~10–20 seconds duration; status checks spaced by at least 10s)
- **Production Preview**: `pnpm preview`
