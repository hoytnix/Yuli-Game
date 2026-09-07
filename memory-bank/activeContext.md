# Active Context: Project Yuli

## Current Focus
- Resolved GitHub Releases CORS redirect block via Netlify Edge Function (`netlify/edge-functions/model-proxy.ts`) with server-side 302 follow and byte-range streaming.
- Resolved wa-sqlite Asyncify stack corruption by introducing a sequential FIFO queue and `SafeOriginPrivateFileSystemVFS` in `src/workers/sqlite.worker.ts`.

## Current Work Stream
- Created `netlify/edge-functions/model-proxy.ts` to stream GitHub Releases directly using server-side fetch with `redirect: "follow"` and full CORS headers (`Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`, `Accept-Ranges: bytes`).
- Removed `/models/yuli.gguf` rewrite rule from `public/_redirects` and added `[[edge_functions]]` definition to `netlify.toml`.
- Replaced `src/workers/sqlite.worker.ts` with serialized FIFO queue implementation, intercepting `NotFoundError` during OPFS file operations (`SafeOriginPrivateFileSystemVFS`), switching to in-memory rollback journal (`PRAGMA journal_mode = MEMORY; PRAGMA synchronous = OFF;`), and queuing all inbound messages.

## Recent State Changes
- Created `netlify/edge-functions/model-proxy.ts`.
- Updated `netlify.toml` and `public/_redirects`.
- Rewrote `src/workers/sqlite.worker.ts` with serialized execution queue.
- Verified build and TypeScript compilation pass cleanly.

## Next Immediate Steps
- Push changes to GitHub/Netlify.
- Clear OPFS storage if testing in browser with old lockfiles (`navigator.storage.getDirectory()`).
- Verify smooth Wllama model download and OPFS SQLite database operations in production.
