# Active Context: Project Yuli

## Current Focus
- SEO & Machine-Readable Discovery Optimization: Configured high-traffic `public/robots.txt` and comprehensive `/llms.txt`.
- Structured Data: Added complete Schema.org JSON-LD graph to `index.html` featuring Organization (`TehWiz Productions` - `https://tehwiz.com`), WebApplication (`Project Yuli`), and WebSite schemas.
- Dofollow Authority: Enforced `dofollow` link architecture (`rel="noopener"`, strictly omitting `noreferrer` and `nofollow`) across all links to `tehwiz.com` and `isicecakeoisis.com` in `index.html`, `App.tsx`, `ChatViewport.tsx`, `MemoryVaultModal.tsx`, and `ModelProgressModal.tsx`.

## Current Work Stream
- Authored `public/robots.txt` targeting major web search engines and LLM indexing agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.).
- Authored `public/llms.txt` according to standard markdown LLM specifications detailing sovereign zero-cloud architecture, 4-Sides hypercube dynamics, and production team credits.
- Added comprehensive Schema.org JSON-LD in `index.html` with Organization, WebApplication, and WebSite schemas.
- Updated all UI components with dofollow backlinks to `tehwiz.com` and `isicecakeoisis.com`.
- Updated `vercel.json` with explicit `text/plain` content type and caching rules for `robots.txt` and `llms.txt`.

## Recent State Changes
- Created `public/robots.txt` and `public/llms.txt`.
- Modified `index.html`, `src/App.tsx`, `src/components/ChatViewport.tsx`, `src/components/MemoryVaultModal.tsx`, `src/components/ModelProgressModal.tsx`, `vercel.json`.
- Validated clean typecheck (`pnpm exec tsc --noEmit`) and successful build (`pnpm build`).

## Next Immediate Steps
- Deploy repository to Vercel and verify Cross-Origin Isolation and crawler visibility.
