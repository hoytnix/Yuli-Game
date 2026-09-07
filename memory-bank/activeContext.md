# Active Context: Project Yuli

## Current Focus
- Resolved GitHub Releases 302 redirect `Range` stripping in `netlify/edge-functions/model-proxy.ts` by resolving redirect with `redirect: "manual"` and streaming byte-range slices directly from upstream storage without timeout severance.
- Resolved `NoModificationAllowedError` on OPFS cache cleanup by automatically terminating the previous Web Worker in `src/hooks/useCognitiveEngine.ts` upon error recovery to release open OPFS file locks.

## Current Work Stream
- Updated `netlify/edge-functions/model-proxy.ts` to resolve GitHub 302 redirects manually to Azure storage (`release-assets.githubusercontent.com`), preserving `Range` and returning `206 Partial Content` slices with full CORS and CORP headers.
- Updated `src/hooks/useCognitiveEngine.ts` to terminate `workerRef.current` and recreate a fresh worker on retry/error recovery, auto-releasing browser OPFS locks.
- Added `READY` and `PROGRESS` outbound message variants in `src/types/index.ts`.

## Recent State Changes
- Modified `netlify/edge-functions/model-proxy.ts`.
- Modified `src/hooks/useCognitiveEngine.ts`.
- Modified `src/types/index.ts`.
- Verified clean compilation with `tsc --noEmit`.

## Next Immediate Steps
- Clear corrupted ~100MB fragment from browser OPFS (`navigator.storage.getDirectory()`).
- Verify smooth Wllama model download with 206 Partial Content slices in production.

