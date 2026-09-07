# Active Context: Project Yuli

## Current Focus
- Resolved Netlify deployment 404s, missing PWA icons, and stale Service Worker chunk caching.
- Enforced mandatory Cross-Origin Isolation (`COOP`/`COEP`) headers and SPA redirect routing for Netlify.

## Current Work Stream
- Created `netlify.toml`, `public/_headers`, and `public/_redirects` to enforce `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on Netlify, along with SPA rewrites (`/* /index.html 200`) and immutable asset caching.
- Generated valid PWA icons (`public/icon-192.png`, `public/icon-512.png`, `public/icon.svg`, and `public/vite.svg`) to eliminate manifest 404s.
- Upgraded `public/sw.js` to `yuli-neuro-v2` with a network-first strategy for navigation requests (`index.html`) to prevent stale HTML from pointing to superseded hashed JS chunks on new deployments.
- Added `vite:preloadError` listener in `src/main.tsx` to automatically recover from stale chunk hash mismatches during deployment rollouts.

## Recent State Changes
- Generated `icon-192.png`, `icon-512.png`, `icon.svg`, `vite.svg` in `public/`.
- Configured Netlify headers and redirects in `netlify.toml`, `public/_headers`, `public/_redirects`.
- Updated `public/sw.js` to network-first navigation caching and bumped cache to v2.
- Updated `index.html` icon links.
- Verified clean build and asset staging in `dist/`.

## Next Immediate Steps
- Push changes to Netlify; test in browser to verify clean PWA icon loading and asset resolution.
- Verify `crossOriginIsolated` is `true` in Netlify console.
- Test Wllama GGUF loading and OPFS database initialization on the live Netlify deployment.
