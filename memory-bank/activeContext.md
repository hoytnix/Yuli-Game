# Active Context: Project Yuli

## Current Focus
- Configured Netlify 200 rewrite edge proxy for the GGUF model (`/models/yuli.gguf`) to bypass browser CORS redirect blocks on GitHub Release assets.
- Configured byte-range slicing headers and cross-origin isolation for model streaming.

## Current Work Stream
- Added rewrite rule `/models/yuli.gguf` -> GitHub Release asset (`200!`) in `public/_redirects` and `netlify.toml`.
- Configured `Access-Control-Allow-Origin: *` and `Accept-Ranges: bytes` for `/models/*` in `public/_headers` and `netlify.toml`.
- Updated `src/lib/constants.ts` with `DEFAULT_MODEL_URL = '/models/yuli.gguf'` and fallback to direct GitHub Release asset URL.
- Updated `src/workers/wllama.worker.ts` default model URL to `/models/yuli.gguf`.
- Configured Vite dev and preview server proxies in `vite.config.ts` to seamlessly proxy `/models/yuli.gguf` during local testing.

## Recent State Changes
- Configured Netlify 200 edge rewrite in `public/_redirects` and `netlify.toml`.
- Updated streaming headers in `public/_headers` and `netlify.toml`.
- Updated `src/lib/constants.ts` and `src/workers/wllama.worker.ts`.
- Verified clean build and bundle output.

## Next Immediate Steps
- Push changes to Netlify; test in browser to verify model streaming via `/models/yuli.gguf` without CORS errors.
- Verify `crossOriginIsolated` is `true` in Netlify console.
- Test Wllama GGUF loading and OPFS database initialization on the live Netlify deployment.
