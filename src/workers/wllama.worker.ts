import { Wllama } from '@wllama/wllama';
import {
  parseThoughtStream,
  extractStateVector,
  calculateIntimacyDelta,
} from '../lib/bitwiseMath';
import { StateVector } from '../types';
import { DEFAULT_MODEL_NAME, HF_MODEL_URL } from '../lib/constants';

const CONFIG_PATHS = {
  default: '/wllama/wllama.wasm',
  'single-thread/wllama.wasm': '/wllama/wllama.wasm',
  'multi-thread/wllama.wasm': '/wllama/wllama.wasm',
};

let wllama: Wllama | null = null;
let isLoading = false;
let isLoaded = false;
let activeModelName: string = DEFAULT_MODEL_NAME;
let currentAbortController: AbortController | null = null;

/**
 * Read cached model weights directly from Origin Private File System (OPFS).
 * Checks root directory, 'models' subdirectory, and Wllama's 'cache' directory.
 */
async function readModelFromOPFS(filename: string): Promise<Blob | File | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null;
    const root = await navigator.storage.getDirectory();

    // 1. Check root directory
    try {
      const handle = await root.getFileHandle(filename);
      return await handle.getFile();
    } catch {}

    // 2. Check 'models' subdirectory
    try {
      const modelsDir = await root.getDirectoryHandle('models');
      const handle = await modelsDir.getFileHandle(filename);
      return await handle.getFile();
    } catch {}

    // 3. Check 'cache' directory (Wllama OPFS cache backend)
    try {
      const cacheDir = await root.getDirectoryHandle('cache');
      // @ts-ignore
      for await (const [name, handle] of cacheDir.entries()) {
        if (handle.kind === 'file' && (name === filename || name.endsWith(`_${filename}`))) {
          return await (handle as FileSystemFileHandle).getFile();
        }
      }
    } catch {}

    return null;
  } catch {
    return null;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  if (type === 'INIT' || type === 'INIT_MODEL') {
    const {
      modelUrl = HF_MODEL_URL,
      customBlob,
      modelPath,
      modelName: explicitModelName,
    } = payload || {};

    const targetModelName =
      explicitModelName ||
      modelPath ||
      (customBlob instanceof File ? customBlob.name : null) ||
      (modelUrl ? modelUrl.split('/').pop()?.split('?')[0] : null) ||
      DEFAULT_MODEL_NAME;

    activeModelName = targetModelName;

    if (isLoaded && wllama?.isModelLoaded()) {
      self.postMessage({
        type: 'READY',
        payload: {
          isMultithread: wllama.isMultithread(),
          activeModelName,
        },
      });
      return;
    }
    if (isLoading) {
      console.warn('[Wllama-Worker] Model loading in progress, skipping duplicate INIT.');
      return;
    }

    isLoading = true;
    isLoaded = false;

    try {
      if (wllama) {
        try {
          await wllama.exit();
        } catch (_) {}
        wllama = null;
      }

      wllama = new Wllama(CONFIG_PATHS, {
        allowOffline: true,
        parallelDownloads: 1,
      });

      // Check if file is provided or already available in OPFS
      let modelSourceBlob: Blob | null = customBlob || null;
      if (!modelSourceBlob) {
        try {
          modelSourceBlob = await readModelFromOPFS(targetModelName);
          if (modelSourceBlob) {
            console.log(`[Wllama-Worker] Found model ${targetModelName} in local OPFS storage.`);
          }
        } catch (e) {
          console.warn('[Wllama-Worker] OPFS lookup warning:', e);
        }
      }

      if (modelSourceBlob) {
        console.log(`[Wllama-Worker] Loading model directly from local Blob/OPFS: ${targetModelName}`);
        const fileToLoad =
          modelSourceBlob instanceof File
            ? modelSourceBlob
            : new File([modelSourceBlob], targetModelName, { type: 'application/octet-stream' });

        await wllama.loadModel([fileToLoad], {
          pathModel: targetModelName,
          identifier: targetModelName,
          n_ctx: 2048,
          n_batch: 512,
          n_threads: Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1)),
        } as any);
      } else {
        console.log(`[Wllama-Worker] Loading model from URL: ${modelUrl} (target: ${targetModelName})`);
        await wllama.loadModelFromUrl(modelUrl, {
          pathModel: targetModelName,
          identifier: targetModelName,
          useCache: true,
          n_ctx: 2048,
          n_batch: 512,
          n_threads: Math.min(4, Math.max(1, (navigator.hardwareConcurrency || 2) - 1)),
          progressCallback: ({ loaded, total }: { loaded: number; total: number }) => {
            self.postMessage({
              type: 'PROGRESS',
              payload: {
                loaded,
                total,
                percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
                activeModelName: targetModelName,
              },
            });
          },
        } as any);
      }

      // Crucial: Verify that C++ runtime actually initialized the model
      if (!wllama.isModelLoaded()) {
        try {
          if (!modelSourceBlob) {
            await wllama.cacheManager?.delete(modelUrl);
          }
        } catch (_) {}
        throw new Error('Model failed internal validation: file is corrupt or truncated.');
      }

      isLoaded = true;
      isLoading = false;
      console.log(`[Wllama-Worker] Model ${targetModelName} successfully loaded and ready.`);
      self.postMessage({
        type: 'READY',
        payload: {
          isMultithread: wllama.isMultithread(),
          activeModelName: targetModelName,
        },
      });
    } catch (err: any) {
      isLoading = false;
      isLoaded = false;
      console.error('[Wllama-Worker] Model load failed:', err);

      if (wllama) {
        try {
          if (!customBlob) {
            await wllama.cacheManager?.delete(modelUrl);
          }
        } catch (_) {}
        try {
          await wllama.exit();
        } catch (_) {}
        wllama = null;
      }

      self.postMessage({
        type: 'ERROR',
        payload: err?.message || String(err),
      });
    }
  }

  if (type === 'COMPLETION' || type === 'GENERATE') {
    if (!wllama || !isLoaded || !wllama.isModelLoaded()) {
      self.postMessage({
        type: 'ERROR',
        payload: 'Model is not initialized or still corrupted in cache.',
      });
      return;
    }

    try {
      const { prompt, options = {}, id = 'completion' } = payload || {};

      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt must be a non-empty string.');
      }

      // Sanitize options specifically for @wllama/wllama C++ action bindings
      const safeOptions: Record<string, any> = {
        nPredict: typeof options.nPredict === 'number' ? options.nPredict : 256,
        temp: typeof options.temp === 'number' ? options.temp : 0.7,
        topP: typeof options.topP === 'number' ? options.topP : 0.9,
        topK: typeof options.topK === 'number' ? options.topK : 40,
      };

      if (Array.isArray(options.stopTrigger)) {
        safeOptions.stopTrigger = options.stopTrigger;
      } else if (Array.isArray(options.stop)) {
        safeOptions.stopTrigger = options.stop;
      } else {
        safeOptions.stopTrigger = ['<end_of_turn>', '<eos>'];
      }

      let currentText = '';
      currentAbortController = new AbortController();

      // Stream tokens back to main thread if callback provided
      safeOptions.onNewToken = (token: number, piece: Uint8Array, text: string) => {
        const decodedPiece = typeof piece === 'string' ? piece : new TextDecoder().decode(piece);
        self.postMessage({
          type: 'TOKEN',
          payload: {
            token,
            piece: decodedPiece,
            currentText: text,
            id,
            rawAccumulated: text,
          },
        });
      };

      // In @wllama/wllama 3.6.1, createCompletion accepts a single options object:
      // { prompt, n_predict, temp, top_p, top_k, stop, stream, onData, abortSignal }
      // To prevent RangeError and std::bad_function_call from garbage WASM pointers,
      // sanitize all sampling flags and wire onData to forward to safeOptions.onNewToken:
      const completionParams: any = {
        prompt,
        n_predict: safeOptions.nPredict,
        max_tokens: safeOptions.nPredict,
        temp: safeOptions.temp,
        temperature: safeOptions.temp,
        top_p: safeOptions.topP,
        top_k: safeOptions.topK,
        stop: safeOptions.stopTrigger,
        stream: true,
        abortSignal: currentAbortController.signal,
        onData: (chunk: any) => {
          const piece = chunk.choices?.[0]?.text || '';
          if (piece) {
            currentText += piece;
            const tokenIdx = chunk.choices?.[0]?.index ?? 0;
            const pieceBytes = new TextEncoder().encode(piece);
            safeOptions.onNewToken(tokenIdx, pieceBytes, currentText);
          }
        },
      };

      const response = await (wllama as any).createCompletion(completionParams);

      self.postMessage({ type: 'SUCCESS', payload: response });

      // Emit COMPLETE with extracted thoughts and state vector for Project Yuli UX
      const fullGenerated = currentText || (typeof response === 'string' ? response : response?.choices?.[0]?.text || '');
      const { cleanText, thoughtText } = parseThoughtStream(fullGenerated);
      const { stateVector, cleanedText: finalClean } = extractStateVector(cleanText, '0EE');
      const intimacyDelta = calculateIntimacyDelta(prompt, finalClean);

      self.postMessage({
        type: 'COMPLETE',
        payload: {
          id,
          fullText: fullGenerated,
          cleanContent: finalClean,
          thoughtContent: thoughtText,
          stateVector: stateVector as StateVector,
          tokensCount: fullGenerated.length > 0 ? fullGenerated.split(/\s+/).length : 0,
          durationMs: 500,
          intimacyDelta,
        },
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' || currentAbortController?.signal.aborted) {
        console.log('[Wllama-Worker] Inference aborted.');
        return;
      }
      console.error('[Wllama-Worker] Completion Error:', err);
      self.postMessage({
        type: 'ERROR',
        payload: err?.message || String(err),
      });
    } finally {
      currentAbortController = null;
    }
  }

  if (type === 'ABORT') {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
  }

  if (type === 'CHECK_STATUS') {
    if (isLoaded && wllama?.isModelLoaded()) {
      self.postMessage({
        type: 'READY',
        payload: {
          isMultithread: wllama.isMultithread(),
          activeModelName,
        },
      });
    } else if (isLoading) {
      self.postMessage({
        type: 'STATUS_UPDATE',
        payload: { status: 'downloading', activeModelName },
      });
    } else {
      self.postMessage({
        type: 'STATUS_UPDATE',
        payload: { status: 'idle', activeModelName },
      });
    }
  }
};
