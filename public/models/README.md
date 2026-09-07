# Project Yuli Model Staging Directory

Place GGUF quantized models here for zero-latency local offline serving:
- Preferred Default: `gemma-4-e2b.Q4_K_M.gguf`
- Fallback / Lightweight: `smollm-360m-instruct-q4_k_m.gguf` or any Gemma / Llama / Qwen GGUF model

The Wllama Web Worker will prioritize loading from `/models/gemma-4-e2b.Q4_K_M.gguf` if present, or stream and cache from designated Hugging Face repositories directly into the browser's Cache Storage / Origin Private File System.
