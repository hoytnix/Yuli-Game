# Active Context: Project Yuli

## Current Focus
- Configured explicit model path and cache identifier overrides (`pathModel` / `identifier`) for Wllama to prevent fallback to generic `models/model-00001-of-00001.gguf`.
- Added direct Origin Private File System (`readModelFromOPFS`) weight loading, allowing cached GGUF blobs and buffers to load directly without URL-string resolution.
- Enforced target `.gguf` filename tracking across `constants.ts`, `useCognitiveEngine.ts`, `ModelProgressModal.tsx`, and `wllama.worker.ts`.

## Current Work Stream
- Added `readModelFromOPFS` in `src/workers/wllama.worker.ts` inspecting OPFS root, `models/`, and `cache/`.
- Updated `loadModel` and `loadModelFromUrl` in `src/workers/wllama.worker.ts` to supply explicit `pathModel` and `identifier` matching the target filename (`yuli-0.1.0-e2b.Q4_K_M.gguf`).
- Updated `src/hooks/useCognitiveEngine.ts` and `src/components/ModelProgressModal.tsx` to forward explicit `modelPath` and synchronize `activeModelName`.
- Verified zero TypeScript errors (`pnpm exec tsc --noEmit`) and successful production build (`pnpm build`).

## Recent State Changes
- Updated `src/types/index.ts`, `src/lib/constants.ts`, `src/workers/wllama.worker.ts`, `src/hooks/useCognitiveEngine.ts`, and `src/components/ModelProgressModal.tsx`.
- Rebuilt production bundle (`dist/`).

## Next Immediate Steps
- Push changes to origin main.
- Verify clean model load from both remote Hugging Face URL and local OPFS file buffers.


