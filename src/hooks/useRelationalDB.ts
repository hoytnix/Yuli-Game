import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PartnerFact,
  InteractionRecord,
  SQLiteInboundMessage,
  SQLiteOutboundMessage,
} from '../types';

export function useRelationalDB() {
  const [isReady, setIsReady] = useState(false);
  const [isOpfs, setIsOpfs] = useState(false);
  const [storageStats, setStorageStats] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [facts, setFacts] = useState<PartnerFact[]>([]);
  const [relationalState, setRelationalStateMap] = useState<Record<string, string>>({});
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [intimacyScore, setIntimacyScore] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Instantiate SQLite worker
    const worker = new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<SQLiteOutboundMessage>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'DB_READY':
          setIsReady(true);
          setIsOpfs(payload.isOpfs);
          if (payload.storageStats) {
            setStorageStats(payload.storageStats);
          }
          // Fetch initial datasets
          worker.postMessage({ type: 'GET_FACTS' } satisfies SQLiteInboundMessage);
          worker.postMessage({ type: 'GET_RELATIONAL_STATE' } satisfies SQLiteInboundMessage);
          worker.postMessage({ type: 'GET_INTERACTIONS', payload: { limit: 50 } } satisfies SQLiteInboundMessage);
          break;

        case 'FACTS_RESULT':
          setFacts(payload);
          break;

        case 'RELATIONAL_STATE_RESULT':
          setRelationalStateMap(payload);
          if (payload.intimacy_score) {
            const parsed = parseFloat(payload.intimacy_score);
            if (!isNaN(parsed)) setIntimacyScore(parsed);
          }
          break;

        case 'INTERACTIONS_RESULT':
          setInteractions(payload);
          break;

        case 'INTIMACY_UPDATED':
          setIntimacyScore(payload.newScore);
          break;

        case 'OP_SUCCESS':
          // Reload datasets after mutation
          worker.postMessage({ type: 'GET_FACTS' } satisfies SQLiteInboundMessage);
          worker.postMessage({ type: 'GET_RELATIONAL_STATE' } satisfies SQLiteInboundMessage);
          worker.postMessage({ type: 'GET_INTERACTIONS', payload: { limit: 50 } } satisfies SQLiteInboundMessage);
          break;

        case 'ERROR':
          console.error('[useRelationalDB] Error:', payload.error);
          setError(payload.error);
          break;
      }
    };

    // Initialize database
    worker.postMessage({ type: 'INIT_DB' } satisfies SQLiteInboundMessage);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const addFact = useCallback((category: string, fact: string) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'ADD_FACT',
      payload: { category, fact },
    } satisfies SQLiteInboundMessage);
  }, []);

  const updateFact = useCallback((id: number, category: string, fact: string) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'UPDATE_FACT',
      payload: { id, category, fact },
    } satisfies SQLiteInboundMessage);
  }, []);

  const deleteFact = useCallback((id: number) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'DELETE_FACT',
      payload: { id },
    } satisfies SQLiteInboundMessage);
  }, []);

  const setRelationalItem = useCallback((key: string, value: string) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'SET_RELATIONAL_STATE',
      payload: { key, value },
    } satisfies SQLiteInboundMessage);
  }, []);

  const recordInteraction = useCallback(
    (userInput: string, yuliResponse: string, stateVector: string, newIntimacy: number) => {
      if (!workerRef.current) return;
      workerRef.current.postMessage({
        type: 'RECORD_INTERACTION',
        payload: {
          timestamp: new Date().toISOString(),
          state_vector: stateVector,
          user_input: userInput,
          yuli_response: yuliResponse,
          intimacy_score: newIntimacy,
        },
      } satisfies SQLiteInboundMessage);
    },
    []
  );

  const resetDatabase = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'RESET_DB' } satisfies SQLiteInboundMessage);
  }, []);

  const refreshData = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'GET_FACTS' } satisfies SQLiteInboundMessage);
    workerRef.current.postMessage({ type: 'GET_RELATIONAL_STATE' } satisfies SQLiteInboundMessage);
    workerRef.current.postMessage({ type: 'GET_INTERACTIONS', payload: { limit: 50 } } satisfies SQLiteInboundMessage);
  }, []);

  return {
    isReady,
    isOpfs,
    storageStats,
    facts,
    relationalState,
    interactions,
    intimacyScore,
    error,
    addFact,
    updateFact,
    deleteFact,
    setRelationalItem,
    recordInteraction,
    resetDatabase,
    refreshData,
  };
}
