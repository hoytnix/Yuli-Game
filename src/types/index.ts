export type StateVector = '0EE' | '1E6' | '2E7' | '3E1';

export type CognitiveSide = 'EGO' | 'SHADOW' | 'SUBCONSCIOUS' | 'SUPEREGO';

export interface PersonalitySideInfo {
  vector: StateVector;
  side: CognitiveSide;
  mbti: string;
  name: string;
  archetype: string;
  description: string;
  dominantGlow: string;
  palette: {
    primary: string;
    secondary: string;
    glow: string;
    border: string;
    badgeBg: string;
    textGlow: string;
  };
  cognitiveStack: [string, string, string, string]; // e.g. ["Ne", "Fi", "Te", "Si"]
  tone: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thoughts?: string;
  stateVector?: StateVector;
  timestamp: number;
  latencyMs?: number;
  tokensGenerated?: number;
  tokensPerSec?: number;
}

export interface PartnerFact {
  id: number;
  category: string;
  fact: string;
  discovered_at: string;
}

export interface RelationalStateItem {
  key: string;
  value: string;
  last_updated: string;
}

export interface InteractionRecord {
  id?: number;
  timestamp: string;
  state_vector: string;
  user_input: string;
  yuli_response: string;
  intimacy_score: number;
}

export interface ModelLoadProgress {
  loadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: 'idle' | 'checking_cache' | 'downloading' | 'compiling_wasm' | 'ready' | 'error';
  isCached: boolean;
  error?: string;
  webGpuSupported: boolean;
  multiThreadSupported: boolean;
  activeModelName: string;
  modelUrl?: string;
}

export interface StorageHealthInfo {
  persisted: boolean;
  quotaBytes: number;
  usageBytes: number;
  percentage: number;
  supported: boolean;
}

export interface CircadianMetrics {
  hour: number;
  period: 'night' | 'dawn' | 'midday' | 'twilight';
  baselineMood: string;
  energyLevel: number; // 0.0 to 1.0
  circadianGreeting: string;
  timeString: string;
}

// Web Worker IPC Message types
export type WllamaInboundMessage =
  | { type: 'INIT_MODEL'; payload: { modelUrl?: string; customBlob?: Blob } }
  | { type: 'INIT'; payload?: { modelUrl?: string; customBlob?: Blob } }
  | { type: 'GENERATE'; payload: { id: string; prompt: string; intimacyScore?: number; partnerFacts?: string[] } }
  | { type: 'COMPLETION'; payload?: { id?: string; prompt: string; options?: any; intimacyScore?: number; partnerFacts?: string[] } }
  | { type: 'ABORT' }
  | { type: 'CHECK_STATUS' };

export type WllamaOutboundMessage =
  | { type: 'STATUS_UPDATE'; payload: Partial<ModelLoadProgress> }
  | { type: 'READY'; payload?: { isMultithread?: boolean } }
  | { type: 'PROGRESS'; payload: { loaded: number; total: number; percentage: number } }
  | { type: 'TOKEN'; payload: { id?: string; token?: string | number; piece?: string; currentText?: string; rawAccumulated?: string } }
  | {
      type: 'COMPLETE';
      payload: {
        id: string;
        fullText: string;
        cleanContent: string;
        thoughtContent: string;
        stateVector: StateVector;
        tokensCount: number;
        durationMs: number;
        intimacyDelta: number;
      };
    }
  | { type: 'SUCCESS'; payload?: any }
  | { type: 'ERROR'; payload: { message: string } | string };

export type SQLiteInboundMessage =
  | { type: 'INIT_DB' }
  | { type: 'RECORD_INTERACTION'; payload: InteractionRecord }
  | { type: 'GET_INTERACTIONS'; payload?: { limit?: number } }
  | { type: 'GET_FACTS' }
  | { type: 'ADD_FACT'; payload: { category: string; fact: string } }
  | { type: 'DELETE_FACT'; payload: { id: number } }
  | { type: 'UPDATE_FACT'; payload: { id: number; category: string; fact: string } }
  | { type: 'GET_RELATIONAL_STATE' }
  | { type: 'SET_RELATIONAL_STATE'; payload: { key: string; value: string } }
  | { type: 'RESET_DB' };

export type SQLiteOutboundMessage =
  | { type: 'DB_READY'; payload: { isOpfs: boolean; storageStats?: { usage: number; quota: number } } }
  | { type: 'INTERACTIONS_RESULT'; payload: InteractionRecord[] }
  | { type: 'FACTS_RESULT'; payload: PartnerFact[] }
  | { type: 'RELATIONAL_STATE_RESULT'; payload: Record<string, string> }
  | { type: 'INTIMACY_UPDATED'; payload: { newScore: number } }
  | { type: 'OP_SUCCESS'; payload: { operation: string } }
  | { type: 'ERROR'; payload: { error: string } };
