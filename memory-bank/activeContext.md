# Active Context: Project Yuli

## Current Focus
- Configured direct download of model weights from Hugging Face resolve URL (`https://huggingface.co/colaformybatteries/yuli-0.1.0-e2b/resolve/main/yuli-0.1.0-e2b.Q4_K_M.gguf`).
- Eliminated dependency on Netlify edge proxy for model streaming, leveraging native Hugging Face CORS and HTTP Range support.
- Avoided redirect/bounds errors associated with external proxies and redirect chains.

## Current Work Stream
- Updated `src/hooks/useCognitiveEngine.ts` to use `HF_MODEL_URL` as default model URL.
- Updated `src/lib/constants.ts` and `src/workers/wllama.worker.ts` to point directly to Hugging Face resolve URL.
- Verified zero TypeScript errors (`pnpm exec tsc --noEmit`) and successful production build (`pnpm build`).

## Recent State Changes
- Updated `src/hooks/useCognitiveEngine.ts`, `src/lib/constants.ts`, and `src/workers/wllama.worker.ts`.
- Rebuilt production bundle (`dist/assets/wllama.worker-*.js`).

## Next Immediate Steps
- Push changes to origin main to trigger Netlify deployment.
- Clear browser OPFS cache in DevTools if prior weights were partially cached.
- Verify clean GGUF model download, range streaming, and inference directly from Hugging Face.


