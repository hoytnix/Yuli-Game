import { Wllama } from '@wllama/wllama';
import {
  WllamaInboundMessage,
  StateVector,
} from '../types';
import {
  parseThoughtStream,
  extractStateVector,
  calculateIntimacyDelta,
} from '../lib/bitwiseMath';
import { DEFAULT_MODEL_NAME, DEFAULT_MODEL_URL } from '../lib/constants';

let wllamaInstance: Wllama | null = null;
let isLoading = false;
let isLoaded = false;
let currentAbortController: AbortController | null = null;
let isBusy = false;
let loadedModelIdentifier = '';

function getWasmConfig() {
  const origin = self.location.origin;
  const wasmPath = `${origin}/wllama/wllama.wasm`;
  return {
    default: wasmPath,
    'single-thread/wllama.wasm': wasmPath,
    'multi-thread/wllama.wasm': wasmPath,
  };
}

async function initWllamaEngine(): Promise<Wllama> {
  if (wllamaInstance) return wllamaInstance;

  const pathConfig = getWasmConfig();
  wllamaInstance = new Wllama(pathConfig, {
    suppressNativeLog: false,
    logger: {
      debug: (...args) => console.debug('[Wllama-Worker]', ...args),
      log: (...args) => console.log('[Wllama-Worker]', ...args),
      warn: (...args) => console.warn('[Wllama-Worker]', ...args),
      error: (...args) => console.error('[Wllama-Worker]', ...args),
    },
    parallelDownloads: 1,
    allowOffline: true,
  });

  return wllamaInstance;
}

self.addEventListener('message', async (event: MessageEvent<WllamaInboundMessage>) => {
  const data = event.data;

  try {
    switch (data.type) {
      case 'CHECK_STATUS': {
        if (isLoaded && wllamaInstance) {
          let webGpu = false;
          try {
            webGpu = typeof wllamaInstance.isSupportWebGPU === 'function' ? wllamaInstance.isSupportWebGPU() : false;
          } catch {
            webGpu = false;
          }
          let hasMulti = false;
          try {
            hasMulti = typeof wllamaInstance.isMultithread === 'function' ? wllamaInstance.isMultithread() : false;
          } catch {
            hasMulti = false;
          }

          self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
              status: 'ready',
              webGpuSupported: webGpu,
              multiThreadSupported: hasMulti,
              activeModelName: loadedModelIdentifier,
              percentage: 100,
              isCached: true,
            },
          });
          self.postMessage({ type: 'READY', payload: { isMultithread: hasMulti } });
          break;
        }

        if (isLoading) {
          self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
              status: 'downloading',
              activeModelName: loadedModelIdentifier,
            },
          });
          break;
        }

        const multiThread =
          typeof navigator !== 'undefined' &&
          'hardwareConcurrency' in navigator &&
          (navigator.hardwareConcurrency || 1) > 1;

        self.postMessage({
          type: 'STATUS_UPDATE',
          payload: {
            status: 'idle',
            webGpuSupported: false,
            multiThreadSupported: multiThread,
            activeModelName: '',
            percentage: 0,
          },
        });
        break;
      }

      case 'INIT':
      case 'INIT_MODEL': {
        const payload = (data as any).payload || {};
        const modelUrl = payload?.modelUrl || DEFAULT_MODEL_URL;
        const customBlob = payload.customBlob;
        const targetUrl = modelUrl;
        loadedModelIdentifier = customBlob ? 'Local Upload GGUF' : targetUrl.split('/').pop() || targetUrl;

        // Guard against duplicate invocations
        if (isLoaded) {
          self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
              status: 'ready',
              percentage: 100,
              isCached: true,
              activeModelName: loadedModelIdentifier,
            },
          });
          self.postMessage({ type: 'READY' });
          return;
        }

        if (isLoading) {
          console.warn('[Wllama-Worker] Model initialization already in progress, skipping duplicate request.');
          return;
        }

        isLoading = true;

        self.postMessage({
          type: 'STATUS_UPDATE',
          payload: {
            status: 'checking_cache',
            percentage: 0,
            activeModelName: loadedModelIdentifier,
            modelUrl: targetUrl,
          },
        });

        try {
          const engine = await initWllamaEngine();

          if (customBlob) {
            self.postMessage({
              type: 'STATUS_UPDATE',
              payload: { status: 'compiling_wasm', percentage: 70 },
            });

            await engine.loadModel([customBlob], {
              n_ctx: 2048,
              n_threads: navigator.hardwareConcurrency ? Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)) : 2,
            });
          } else {
            // Validate existing cache integrity before loading
            try {
              const cacheName = await engine.cacheManager.getNameFromURL(targetUrl);
              const meta = await engine.cacheManager.getMetadata(cacheName);
              const size = await engine.cacheManager.getSize(cacheName);
              if (meta && meta.originalSize > 0 && size > 0 && size !== meta.originalSize) {
                console.warn(
                  `[Wllama-Worker] Cached model size mismatch (${size} vs expected ${meta.originalSize} bytes). Purging corrupt cache...`
                );
                await engine.cacheManager.delete(targetUrl);
              }
            } catch (cacheCheckErr) {
              console.warn('[Wllama-Worker] Cache check notice:', cacheCheckErr);
            }

            // Stream from URL with verified cache
            await engine.loadModelFromUrl(targetUrl, {
              useCache: true,
              n_ctx: 2048,
              n_threads: navigator.hardwareConcurrency ? Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)) : 2,
              progressCallback: ({ loaded, total }) => {
                const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
                self.postMessage({
                  type: 'STATUS_UPDATE',
                  payload: {
                    status: 'downloading',
                    loadedBytes: loaded,
                    totalBytes: total,
                    percentage: pct,
                    isCached: false,
                  },
                });
                self.postMessage({
                  type: 'PROGRESS',
                  payload: {
                    loaded,
                    total,
                    percentage: pct,
                  },
                });
              },
            });
          }

          isLoaded = engine.isModelLoaded();
          isLoading = false;

          // Only inspect properties AFTER loadModelFromUrl completes
          let webGpu = false;
          try {
            webGpu = typeof engine.isSupportWebGPU === 'function' ? engine.isSupportWebGPU() : false;
          } catch {
            webGpu = false;
          }

          let hasMulti = false;
          try {
            hasMulti = typeof engine.isMultithread === 'function' ? engine.isMultithread() : false;
          } catch {
            hasMulti = false;
          }

          console.log('[Wllama-Worker] Model successfully loaded and ready.');

          self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
              status: isLoaded ? 'ready' : 'error',
              percentage: 100,
              isCached: true,
              activeModelName: loadedModelIdentifier,
              webGpuSupported: webGpu,
              multiThreadSupported: hasMulti,
            },
          });

          self.postMessage({
            type: 'READY',
            payload: { isMultithread: hasMulti },
          });
        } catch (loadErr: any) {
          isLoading = false;
          isLoaded = false;
          wllamaInstance = null;
          console.error('[Wllama-Worker] Failed to load model:', loadErr);
          try {
            const engine = await initWllamaEngine();
            await engine.cacheManager.delete(targetUrl);
          } catch {
            // Ignore cache deletion errors
          }
          self.postMessage({
            type: 'ERROR',
            payload: { message: loadErr?.message || 'Failed to load model from GitHub CDN' },
          });
        }
        break;
      }

      case 'ABORT': {
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = null;
        }
        isBusy = false;
        break;
      }

      case 'GENERATE': {
        const { id, prompt, intimacyScore } = data.payload;

        if (isBusy && currentAbortController) {
          currentAbortController.abort();
        }

        isBusy = true;
        currentAbortController = new AbortController();

        const engine = await initWllamaEngine();

        if (!engine.isModelLoaded()) {
          // If model is not loaded yet, throw informative error
          self.postMessage({
            type: 'ERROR',
            payload: { message: 'Neural weights not initialized. Please load a GGUF model via the cognitive loader.' },
          });
          isBusy = false;
          return;
        }

        // Gemma chat template formatting as mandated by specification:
        // <start_of_turn>user\n{prompt}<end_of_turn>\n<start_of_turn>model\n
        const formattedPrompt = `<start_of_turn>user\n${prompt}<end_of_turn>\n<start_of_turn>model\n`;

        let rawAccumulated = '';
        const startTime = performance.now();
        let tokenCount = 0;

        try {
          await (engine as any).createCompletion({
            prompt: formattedPrompt,
            temp: 0.35,
            top_p: 0.92,
            max_tokens: 1024,
            nPredict: 1024,
            stop: ['<end_of_turn>', '<eos>'],
            stream: true,
            abortSignal: currentAbortController.signal,
            onData: (chunk: any) => {
              const textPiece = chunk.choices[0]?.text || '';
              if (textPiece) {
                tokenCount++;
                rawAccumulated += textPiece;
                self.postMessage({
                  type: 'TOKEN',
                  payload: {
                    id,
                    token: textPiece,
                    rawAccumulated,
                  },
                });
              }
            },
          });

          const durationMs = Math.max(1, performance.now() - startTime);

          // Parse cognitive components
          const { cleanText, thoughtText } = parseThoughtStream(rawAccumulated);
          const { stateVector, cleanedText: finalClean } = extractStateVector(cleanText, '0EE');
          const intimacyDelta = calculateIntimacyDelta(prompt, finalClean);

          self.postMessage({
            type: 'COMPLETE',
            payload: {
              id,
              fullText: rawAccumulated,
              cleanContent: finalClean,
              thoughtContent: thoughtText,
              stateVector: stateVector as StateVector,
              tokensCount: tokenCount,
              durationMs,
              intimacyDelta,
            },
          });
        } catch (genErr: any) {
          if (genErr?.name === 'AbortError' || currentAbortController?.signal.aborted) {
            console.log('[Wllama-Worker] Generation aborted by user.');
          } else {
            console.error('[Wllama-Worker] Inference Error:', genErr);
            self.postMessage({
              type: 'ERROR',
              payload: { message: genErr?.message || 'Inference execution failed' },
            });
          }
        } finally {
          isBusy = false;
          currentAbortController = null;
        }
        break;
      }

      case 'COMPLETION': {
        if (!wllamaInstance || !isLoaded) {
          self.postMessage({
            type: 'ERROR',
            payload: { message: 'Model is not loaded yet.' },
          });
          break;
        }
        try {
          const { prompt, options } = (data as any).payload || {};
          const response = await (wllamaInstance as any).createCompletion(prompt, options || {});
          self.postMessage({ type: 'SUCCESS', payload: response });
        } catch (err: any) {
          self.postMessage({
            type: 'ERROR',
            payload: { message: err?.message || String(err) },
          });
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('[Wllama-Worker] Unhandled worker exception:', err);
    self.postMessage({
      type: 'ERROR',
      payload: { message: err?.message || 'Internal neural worker fault' },
    });
  }
});
