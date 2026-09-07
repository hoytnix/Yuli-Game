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
    parallelDownloads: 3,
    allowOffline: true,
  });

  return wllamaInstance;
}

self.addEventListener('message', async (event: MessageEvent<WllamaInboundMessage>) => {
  const data = event.data;

  try {
    switch (data.type) {
      case 'CHECK_STATUS': {
        const engine = await initWllamaEngine();
        const isLoaded = engine.isModelLoaded();
        const webGpu = typeof engine.isSupportWebGPU === 'function' ? engine.isSupportWebGPU() : false;
        const multiThread = typeof engine.isMultithread === 'function' ? engine.isMultithread() : true;

        self.postMessage({
          type: 'STATUS_UPDATE',
          payload: {
            status: isLoaded ? 'ready' : 'idle',
            webGpuSupported: webGpu,
            multiThreadSupported: multiThread,
            activeModelName: isLoaded ? loadedModelIdentifier : '',
            percentage: isLoaded ? 100 : 0,
          },
        });
        break;
      }

      case 'INIT':
      case 'INIT_MODEL': {
        const payload = (data as any).payload || {};
        const modelUrl = payload.modelUrl;
        const customBlob = payload.customBlob;
        const targetUrl = modelUrl || DEFAULT_MODEL_URL;
        loadedModelIdentifier = customBlob ? 'Local Upload GGUF' : targetUrl.split('/').pop() || targetUrl;

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
            // Check if model already in cache or stream from URL
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
              },
            });
          }

          const isLoaded = engine.isModelLoaded();
          const webGpu = typeof engine.isSupportWebGPU === 'function' ? engine.isSupportWebGPU() : false;
          const multiThread = typeof engine.isMultithread === 'function' ? engine.isMultithread() : true;

          self.postMessage({
            type: 'STATUS_UPDATE',
            payload: {
              status: isLoaded ? 'ready' : 'error',
              percentage: 100,
              isCached: true,
              activeModelName: loadedModelIdentifier,
              webGpuSupported: webGpu,
              multiThreadSupported: multiThread,
            },
          });
        } catch (loadErr: any) {
          console.error('[Wllama-Worker] Failed to load model:', loadErr);
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
    }
  } catch (err: any) {
    console.error('[Wllama-Worker] Unhandled worker exception:', err);
    self.postMessage({
      type: 'ERROR',
      payload: { message: err?.message || 'Internal neural worker fault' },
    });
  }
});
