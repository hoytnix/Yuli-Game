# Active Context: Project Yuli

## Current Focus
- Updated Netlify Edge Function (`model-proxy.ts`) to return an HTTP 307 redirect with CORS headers (`Location: <Azure Signed URL>`), allowing the browser to stream directly from Azure storage without hitting Netlify's 30-second edge function execution timeout.
- Hardened Wllama cache management in `src/workers/wllama.worker.ts`: set `allowOffline: false` in `initWllamaEngine`, added automatic validation of cached file size against `metadata.originalSize`, and added automated purging of corrupt/truncated cache files on load failure.

## Current Work Stream
- Verified local GGUF file size (`1,200,590,848` bytes) and magic bytes (`GGUF`), confirming 100% byte-for-byte identity with GitHub Releases remote `Content-Length`.
- Replaced streaming proxy in `netlify/edge-functions/model-proxy.ts` with HTTP 307 redirect.
- Added cache pre-validation and error cache purge in `src/workers/wllama.worker.ts`.

## Recent State Changes
- Modified `netlify/edge-functions/model-proxy.ts`.
- Modified `src/workers/wllama.worker.ts`.
- Confirmed zero errors with `pnpm exec tsc --noEmit`.

## Next Immediate Steps
- Push changes to origin main to trigger Netlify deployment.
- Wipe existing corrupted model fragment from browser OPFS via DevTools console.
- Test clean 307 redirect model load in browser.

