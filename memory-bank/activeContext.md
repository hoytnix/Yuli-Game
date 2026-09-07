# Active Context: Project Yuli

## Current Focus
- Resolved Azure Blob cross-origin blockage caused by HTTP 307 client redirects by implementing a true HTTP 206 Partial Content Range streamer in Netlify Edge Function (`netlify/edge-functions/model-proxy.ts`).
- Forwarded client `Range: bytes=start-end` headers upstream to Azure, streaming small byte chunks with explicit CORS headers (`Access-Control-Allow-Origin: *`, `Accept-Ranges: bytes`, `Access-Control-Expose-Headers`).
- Set `parallelDownloads: 1` in `src/workers/wllama.worker.ts` to ensure sequential chunk retrieval, avoiding edge concurrency limits.

## Current Work Stream
- Converted `model-proxy.ts` from HTTP 307 redirect back to server-side 206 chunk streamer with full byte-range header forwarding.
- Configured Wllama with sequential downloads (`parallelDownloads: 1`) and active cache integrity checks.

## Recent State Changes
- Modified `netlify/edge-functions/model-proxy.ts`.
- Modified `src/workers/wllama.worker.ts`.
- Confirmed zero errors with `pnpm exec tsc --noEmit`.

## Next Immediate Steps
- Wipe existing corrupted model fragments and lockfiles from browser OPFS via DevTools console.
- Commit and push to origin main to trigger Netlify deployment.
- Verify sub-second 206 Partial Content responses and successful model mounting.

