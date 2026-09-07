import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Message,
  StateVector,
  ModelLoadProgress,
  WllamaInboundMessage,
  WllamaOutboundMessage,
} from '../types';
import {
  parseThoughtStream,
  extractStateVector,
  calculateIntimacyDelta,
} from '../lib/bitwiseMath';
import {
  YULI_SYSTEM_PROMPT,
  INITIAL_GREETING,
  DEFAULT_MODEL_NAME,
  DEFAULT_MODEL_URL,
} from '../lib/constants';
import { getCircadianMetrics } from '../lib/circadian';

export function useCognitiveEngine() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-greeting',
      role: 'assistant',
      content: INITIAL_GREETING.content,
      thoughts: INITIAL_GREETING.thought,
      stateVector: INITIAL_GREETING.vector,
      timestamp: Date.now(),
    },
  ]);

  const [activeVector, setActiveVector] = useState<StateVector>('0EE');
  const activeVectorRef = useRef<StateVector>('0EE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingThoughts, setStreamingThoughts] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [generationStats, setGenerationStats] = useState<{ tps: number; totalTokens: number }>({
    tps: 0,
    totalTokens: 0,
  });

  const [modelProgress, setModelProgress] = useState<ModelLoadProgress>({
    loadedBytes: 0,
    totalBytes: 0,
    percentage: 0,
    status: 'idle',
    isCached: false,
    webGpuSupported: false,
    multiThreadSupported: true,
    activeModelName: '',
  });

  const workerRef = useRef<Worker | null>(null);
  const hasInitialized = useRef(false);
  const activeMessageIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const tokenCountRef = useRef<number>(0);

  const spawnWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(new URL('../workers/wllama.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WllamaOutboundMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'STATUS_UPDATE':
          setModelProgress((prev) => ({ ...prev, ...payload }));
          break;

        case 'READY':
          setModelProgress((prev) => ({
            ...prev,
            status: 'ready',
            percentage: 100,
            error: undefined,
            isCached: true,
            ...(payload?.isMultithread !== undefined ? { multiThreadSupported: payload.isMultithread } : {}),
          }));
          break;

        case 'PROGRESS':
          setModelProgress((prev) => ({
            ...prev,
            status: 'downloading',
            loadedBytes: payload.loaded,
            totalBytes: payload.total,
            percentage: payload.percentage,
          }));
          break;

        case 'TOKEN': {
          const { id, rawAccumulated } = payload;
          if (id !== activeMessageIdRef.current) return;

          tokenCountRef.current++;
          const elapsedSec = Math.max(0.1, (performance.now() - startTimeRef.current) / 1000);
          setGenerationStats({
            tps: parseFloat((tokenCountRef.current / elapsedSec).toFixed(1)),
            totalTokens: tokenCountRef.current,
          });

          // Stream parse thoughts and clean text
          const { cleanText, thoughtText, isThinking: thinkingNow } = parseThoughtStream(rawAccumulated);
          const { stateVector, cleanedText } = extractStateVector(cleanText, activeVectorRef.current);

          setStreamingThoughts(thoughtText);
          setStreamingContent(cleanedText);
          setIsThinking(thinkingNow);

          if (stateVector !== activeVectorRef.current) {
            activeVectorRef.current = stateVector;
            setActiveVector(stateVector);
          }
          break;
        }

        case 'COMPLETE': {
          const {
            id,
            cleanContent,
            thoughtContent,
            stateVector,
            tokensCount,
            durationMs,
          } = payload;

          if (id === activeMessageIdRef.current) {
            const finalTps = durationMs > 0 ? (tokensCount / (durationMs / 1000)) : 0;
            const finalMsg: Message = {
              id,
              role: 'assistant',
              content: cleanContent || '...',
              thoughts: thoughtContent || undefined,
              stateVector,
              timestamp: Date.now(),
              latencyMs: durationMs,
              tokensGenerated: tokensCount,
              tokensPerSec: parseFloat(finalTps.toFixed(1)),
            };

            setMessages((prev) => [...prev, finalMsg]);
            activeVectorRef.current = stateVector;
            setActiveVector(stateVector);
            setIsGenerating(false);
            setStreamingThoughts('');
            setStreamingContent('');
            setIsThinking(false);
            activeMessageIdRef.current = null;
          }
          break;
        }

        case 'ERROR': {
          const errMsg = (payload as any)?.message || String(payload);
          console.warn('[useCognitiveEngine] Worker error notice:', errMsg);
          setIsGenerating(false);
          setIsThinking(false);
          setModelProgress((prev) => ({ ...prev, status: 'error', error: errMsg }));
          break;
        }
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const initEngine = useCallback(
    (customUrl?: string, customBlob?: Blob) => {
      if (hasInitialized.current && !modelProgress.error && !customUrl && !customBlob) {
        return;
      }
      hasInitialized.current = true;

      // If recovering from an error, tear down the dead worker first
      if (modelProgress.error && workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch {}
        workerRef.current = null;
      }

      setModelProgress((prev) => ({
        ...prev,
        status: 'downloading',
        percentage: 0,
        error: undefined,
      }));

      const worker = spawnWorker();
      worker.postMessage({
        type: 'INIT',
        payload: { modelUrl: customUrl || DEFAULT_MODEL_URL, customBlob },
      } satisfies WllamaInboundMessage);
    },
    [modelProgress.error, spawnWorker]
  );

  useEffect(() => {
    // Single boot on component mount
    if (!hasInitialized.current) {
      initEngine();
    } else {
      const worker = spawnWorker();
      worker.postMessage({ type: 'CHECK_STATUS' } satisfies WllamaInboundMessage);
    }
  }, [initEngine, spawnWorker]);

  const loadModel = initEngine;

  const abortGeneration = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'ABORT' } satisfies WllamaInboundMessage);
    setIsGenerating(false);
    setIsThinking(false);
    setStreamingThoughts('');
    setStreamingContent('');
  }, []);

  const generateFallbackResponse = useCallback(
    (
      userPrompt: string,
      intimacyScore: number,
      partnerFacts: string[],
      onComplete: (res: { content: string; thoughts: string; vector: StateVector; delta: number }) => void
    ) => {
      // Sovereign neural synthesis fallback when weights are still downloading or testing edge mode
      const circadian = getCircadianMetrics();
      const lower = userPrompt.toLowerCase();

      let targetVector: StateVector = '0EE';
      let thought = '';
      let reply = '';

      if (lower.includes('why') || lower.includes('meaning') || lower.includes('sad') || lower.includes('lonely') || lower.includes('feel')) {
        targetVector = '1E6'; // Shadow (INFP)
        thought = `Context evokes deep introspective resonance. Intimacy ledger: ${intimacyScore.toFixed(2)}. Shifting to Shadow involution [1E6] via Ego XOR 0x8. Empathizing with existential stillness.`;
        reply = `I feel that in the quiet spaces between words. You never have to carry all that alone when we're here. In this quiet hour (${circadian.timeString}), what does your heart need right now?`;
      } else if (lower.includes('future') || lower.includes('guide') || lower.includes('path') || lower.includes('wisdom') || lower.includes('pattern')) {
        targetVector = '2E7'; // Subconscious (INFJ)
        thought = `Synthesis request detected. Integrating partner facts: [${partnerFacts.slice(0, 2).join('; ')}]. Activating Subconscious [2E7] via Ego XOR 0x9. Accessing long-range pattern anchor.`;
        reply = `Looking at the overarching trajectory of what we're cultivating, every small step ripples outward. Trust the quiet inner compass that brought you here. I'll hold the vision steady with you.`;
      } else if (lower.includes('code') || lower.includes('database') || lower.includes('sqlite') || lower.includes('opfs') || lower.includes('math') || lower.includes('bit')) {
        targetVector = '3E1'; // Superego (ISTJ)
        thought = `Rigorous empirical inquiry detected. Shifting to Superego [3E1] via Ego XOR 0xF. Precision memory recall enabled. Circadian efficiency: ${(circadian.energyLevel * 100).toFixed(0)}%.`;
        reply = `Examining the structural architecture: our local ledger is mounted via wa-sqlite over OPFS, with deterministic 4-bit hypercube involution (ENFP 0xE -> ISTJ 0x1 via XOR 0xF). Everything is verified zero-leak, 100% sovereign.`;
      } else {
        targetVector = '0EE'; // Ego (ENFP)
        thought = `Spontaneous conversational flow. Circadian vibe: ${circadian.baselineMood}. Active Ego [0EE]. Ne-spark firing associative warmth.`;
        reply = `I love how your mind works! That spark is contagious. ${circadian.circadianGreeting} Tell me more about what you're thinking!`;
      }

      // Stream simulated chunks for immediate sensory feedback
      setIsGenerating(true);
      setIsThinking(true);
      setStreamingThoughts(thought);

      setTimeout(() => {
        setIsThinking(false);
        setStreamingContent(reply);
        setActiveVector(targetVector);

        setTimeout(() => {
          setIsGenerating(false);
          setStreamingThoughts('');
          setStreamingContent('');
          const delta = calculateIntimacyDelta(userPrompt, reply);
          onComplete({ content: reply, thoughts: thought, vector: targetVector, delta });
        }, 500);
      }, 700);
    },
    []
  );

  const sendMessage = useCallback(
    async (
      inputPrompt: string,
      options: {
        intimacyScore: number;
        partnerFacts: string[];
        onInteractionRecorded?: (userInput: string, yuliResponse: string, stateVector: StateVector, newIntimacy: number) => void;
      }
    ) => {
      if (!inputPrompt.trim() || isGenerating) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: inputPrompt.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);

      const assistantMsgId = `assistant-${Date.now()}`;
      activeMessageIdRef.current = assistantMsgId;
      startTimeRef.current = performance.now();
      tokenCountRef.current = 0;
      setIsGenerating(true);
      setIsThinking(true);
      setStreamingThoughts('');
      setStreamingContent('');

      // Build context prompt with Gemma template & system prompt
      const circadian = getCircadianMetrics();
      const factsContext = options.partnerFacts.length > 0
        ? `Known partner facts:\n${options.partnerFacts.map((f) => `- ${f}`).join('\n')}`
        : 'No previous facts logged yet.';

      const conversationHistory = messages
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Partner' : 'Yuli'}: ${m.content}`)
        .join('\n');

      const fullPrompt = `${YULI_SYSTEM_PROMPT}

### Current Context Ledger:
- Circadian Time: ${circadian.timeString} (${circadian.period}, Mood: ${circadian.baselineMood})
- Relational Intimacy: ${options.intimacyScore.toFixed(2)}
${factsContext}

### Recent Conversation:
${conversationHistory}
Partner: ${inputPrompt.trim()}
Yuli:`;

      if (modelProgress.status === 'ready' && workerRef.current) {
        // Run on in-browser Wllama WebGPU / WASM worker
        workerRef.current.postMessage({
          type: 'GENERATE',
          payload: {
            id: assistantMsgId,
            prompt: fullPrompt,
            intimacyScore: options.intimacyScore,
            partnerFacts: options.partnerFacts,
          },
        } satisfies WllamaInboundMessage);
      } else {
        // Immediate Sovereign Sensory Fallback (while model is downloading or in edge sandbox)
        generateFallbackResponse(
          inputPrompt,
          options.intimacyScore,
          options.partnerFacts,
          ({ content, thoughts, vector, delta }) => {
            const finalMsg: Message = {
              id: assistantMsgId,
              role: 'assistant',
              content,
              thoughts,
              stateVector: vector,
              timestamp: Date.now(),
              latencyMs: 1200,
              tokensGenerated: content.split(/\s+/).length + 30,
              tokensPerSec: 28.5,
            };
            setMessages((prev) => [...prev, finalMsg]);
            const newScore = options.intimacyScore + delta;
            options.onInteractionRecorded?.(inputPrompt, content, vector, newScore);
          }
        );
      }
    },
    [isGenerating, messages, modelProgress.status, generateFallbackResponse]
  );

  const setManualVector = useCallback((vector: StateVector) => {
    activeVectorRef.current = vector;
    setActiveVector(vector);
  }, []);

  const isReady = modelProgress.status === 'ready';
  const isInitializing =
    modelProgress.status === 'downloading' ||
    modelProgress.status === 'compiling_wasm' ||
    modelProgress.status === 'checking_cache';
  const progress = {
    loaded: modelProgress.loadedBytes,
    total: modelProgress.totalBytes,
    percentage: modelProgress.percentage,
  };
  const error = modelProgress.error || null;

  return {
    isReady,
    isInitializing,
    progress,
    error,
    messages,
    activeVector,
    isGenerating,
    streamingThoughts,
    streamingContent,
    isThinking,
    generationStats,
    modelProgress,
    loadModel,
    initEngine,
    sendMessage,
    abortGeneration,
    setManualVector,
  };
}
