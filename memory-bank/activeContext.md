# Active Context: Project Yuli

## Current Focus
- Migrated deployment target from Netlify to Vercel.
- Configured `vercel.json` with Invariant 5 Cross-Origin Isolation headers (`COOP: same-origin`, `COEP: require-corp`), SPA client routing rewrites, immutable asset caching, and no-cache headers for service worker/HTML.
- Created `api/model-proxy.ts` Edge Function to stream GGUF model chunks with HTTP Range request support and CORS forwarding.

## Current Work Stream
- Added `vercel.json` with full security headers, routing rewrites, and cache directives.
- Implemented `api/model-proxy.ts` on Vercel Edge runtime, replacing `netlify/edge-functions/model-proxy.ts`.
- Removed legacy Netlify files (`netlify.toml`, `netlify/`, `public/_headers`, `public/_redirects`).
- Updated `src/lib/constants.ts` to reference Vercel Edge Proxy.
- Updated `tsconfig.json` to include `api/`.
- Validated clean typecheck (`pnpm exec tsc --noEmit`) and successful build (`pnpm build`).

## Recent State Changes
- Created `vercel.json` and `api/model-proxy.ts`.
- Removed `netlify.toml`, `netlify/edge-functions/model-proxy.ts`, `public/_headers`, `public/_redirects`.
- Modified `src/lib/constants.ts` and `tsconfig.json`.

## Next Immediate Steps
- Deploy repository to Vercel and verify Cross-Origin Isolation in browser DevTools.


