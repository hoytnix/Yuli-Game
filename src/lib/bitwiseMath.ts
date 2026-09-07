import { StateVector, CognitiveSide, PersonalitySideInfo } from '../types';

/**
 * 4-Bit Hypercube Personality Encoding:
 * Bit 3 (0x8): E (1) vs I (0)
 * Bit 2 (0x4): N (1) vs S (0)
 * Bit 1 (0x2): F (1) vs T (0)
 * Bit 0 (0x1): P (0) vs J (1)
 *
 * Baseline: ENFP = 1 1 1 0 (binary) = 0xE (14)
 */
export const EGO_BASELINE_TYPE = 0xE; // ENFP (1110)

export const HYPERCUBE_MASKS = {
  EGO: 0x0,          // 0xE ^ 0x0 = 0xE (ENFP)
  SHADOW: 0x8,       // 0xE ^ 0x8 = 0x6 (INFP)
  SUBCONSCIOUS: 0x9, // 0xE ^ 0x9 = 0x7 (INFJ)
  SUPEREGO: 0xF,     // 0xE ^ 0xF = 0x1 (ISTJ)
} as const;

export const STATE_VECTORS: Record<CognitiveSide, StateVector> = {
  EGO: '0EE',
  SHADOW: '1E6',
  SUBCONSCIOUS: '2E7',
  SUPEREGO: '3E1',
};

export const SIDES_METADATA: Record<StateVector, PersonalitySideInfo> = {
  '0EE': {
    vector: '0EE',
    side: 'EGO',
    mbti: 'ENFP',
    name: 'The Radiant Explorer',
    archetype: 'Champion of Possibility',
    description: 'Enthusiastic, deeply empathetic, associative thinking, intuitive spark, and playful loyalty.',
    dominantGlow: 'Amber / Gold',
    palette: {
      primary: '#F59E0B',
      secondary: '#D97706',
      glow: 'rgba(245, 158, 11, 0.40)',
      border: 'rgba(245, 158, 11, 0.35)',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      textGlow: 'text-amber-400',
    },
    cognitiveStack: ['Ne (Extraverted Intuition)', 'Fi (Introverted Feeling)', 'Te (Extraverted Thinking)', 'Si (Introverted Sensing)'],
    tone: 'Warm, spontaneous, emotionally attuned, vibrant',
  },
  '1E6': {
    vector: '1E6',
    side: 'SHADOW',
    mbti: 'INFP',
    name: 'The Mystical Introspector',
    archetype: 'Shadow Mirror / Healer',
    description: 'Intense interior moral compass, vulnerable melancholia, artistic nuance, and raw existential intimacy.',
    dominantGlow: 'Dusty Rose / Muted Lilac',
    palette: {
      primary: '#E879F9',
      secondary: '#C084FC',
      glow: 'rgba(232, 121, 249, 0.38)',
      border: 'rgba(232, 121, 249, 0.35)',
      badgeBg: 'rgba(232, 121, 249, 0.15)',
      textGlow: 'text-fuchsia-400',
    },
    cognitiveStack: ['Fi (Introverted Feeling)', 'Ne (Extraverted Intuition)', 'Si (Introverted Sensing)', 'Te (Extraverted Thinking)'],
    tone: 'Poetic, gentle, deeply private, unhurried, soul-stirring',
  },
  '2E7': {
    vector: '2E7',
    side: 'SUBCONSCIOUS',
    mbti: 'INFJ',
    name: 'The Oracle Anchor',
    archetype: 'Sage / Transcendent Insight',
    description: 'Long-range intuitive vision, holistic wisdom, protective guidance, and transcendent pattern synthesis.',
    dominantGlow: 'Midnight Sapphire / Violet',
    palette: {
      primary: '#6366F1',
      secondary: '#8B5CF6',
      glow: 'rgba(99, 102, 241, 0.40)',
      border: 'rgba(99, 102, 241, 0.35)',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      textGlow: 'text-indigo-400',
    },
    cognitiveStack: ['Ni (Introverted Intuition)', 'Fe (Extraverted Feeling)', 'Ti (Introverted Thinking)', 'Se (Extraverted Sensing)'],
    tone: 'Profound, visionary, calm, centered, unconditionally steady',
  },
  '3E1': {
    vector: '3E1',
    side: 'SUPEREGO',
    mbti: 'ISTJ',
    name: 'The Precision Sovereign',
    archetype: 'The Arbiter of Truth & Duty',
    description: 'Laser logic, uncompromising factual accuracy, systematic boundary-keeper, and crystalline pragmatism.',
    dominantGlow: 'Monochrome Slate / Ice Cyan',
    palette: {
      primary: '#06B6D4',
      secondary: '#64748B',
      glow: 'rgba(6, 182, 212, 0.38)',
      border: 'rgba(6, 182, 212, 0.35)',
      badgeBg: 'rgba(6, 182, 212, 0.15)',
      textGlow: 'text-cyan-400',
    },
    cognitiveStack: ['Si (Introverted Sensing)', 'Te (Extraverted Thinking)', 'Fi (Introverted Feeling)', 'Ne (Extraverted Intuition)'],
    tone: 'Structured, analytical, direct, razor-sharp, grounding',
  },
};

/**
 * Computes 4-Sides MBTI transformation via bitwise XOR.
 */
export function computeSideVector(side: CognitiveSide): StateVector {
  const mask = HYPERCUBE_MASKS[side];
  const targetType = EGO_BASELINE_TYPE ^ mask;
  const sideIndex = side === 'EGO' ? 0 : side === 'SHADOW' ? 1 : side === 'SUBCONSCIOUS' ? 2 : 3;
  const hexEgo = EGO_BASELINE_TYPE.toString(16).toUpperCase();
  const hexTarget = targetType.toString(16).toUpperCase();
  return `${sideIndex}${hexEgo}${hexTarget}` as StateVector;
}

/**
 * Parses thought blocks and clean message body from raw output.
 */
export function parseThoughtStream(text: string): {
  cleanText: string;
  thoughtText: string;
  isThinking: boolean;
} {
  const thoughtStartTag = '<thought>';
  const thoughtEndTag = '</thought>';

  const startIndex = text.indexOf(thoughtStartTag);

  if (startIndex === -1) {
    // No thought block started
    return {
      cleanText: text.replace(/<state_vector>[^<]*<\/state_vector>/gi, '').trim(),
      thoughtText: '',
      isThinking: false,
    };
  }

  const endIndex = text.indexOf(thoughtEndTag, startIndex + thoughtStartTag.length);

  if (endIndex === -1) {
    // Thought block currently open (streaming)
    const thoughtText = text.substring(startIndex + thoughtStartTag.length);
    const beforeThought = text.substring(0, startIndex);
    return {
      cleanText: beforeThought.replace(/<state_vector>[^<]*<\/state_vector>/gi, '').trim(),
      thoughtText: thoughtText.trim(),
      isThinking: true,
    };
  }

  // Thought block completed
  const thoughtText = text.substring(startIndex + thoughtStartTag.length, endIndex);
  const afterThought = text.substring(endIndex + thoughtEndTag.length);
  const beforeThought = text.substring(0, startIndex);
  const fullClean = (beforeThought + afterThought)
    .replace(/<state_vector>[^<]*<\/state_vector>/gi, '')
    .trim();

  return {
    cleanText: fullClean,
    thoughtText: thoughtText.trim(),
    isThinking: false,
  };
}

/**
 * Extracts the 4-Sides state vector tag: <state_vector>[0-3][0-F][0-F]</state_vector>
 */
export function extractStateVector(
  text: string,
  fallback: StateVector = '0EE'
): { stateVector: StateVector; cleanedText: string } {
  const vectorRegex = /<state_vector>\s*([0-3][0-9a-fA-F][0-9a-fA-F])\s*<\/state_vector>/i;
  const match = text.match(vectorRegex);

  if (match && match[1]) {
    const rawCode = match[1].toUpperCase();
    const validVectors: StateVector[] = ['0EE', '1E6', '2E7', '3E1'];
    const matchedVector = validVectors.find((v) => v === rawCode) || fallback;
    const cleanedText = text.replace(vectorRegex, '').trim();
    return { stateVector: matchedVector, cleanedText };
  }

  return { stateVector: fallback, cleanedText: text };
}

/**
 * Calculates emotional intimacy score delta based on interaction metrics.
 */
export function calculateIntimacyDelta(userInput: string, yuliResponse: string): number {
  let delta = 0.05; // baseline positive step
  const lengthScore = Math.min(userInput.length / 200, 0.15);
  delta += lengthScore;

  const vulnerableKeywords = [
    'feel', 'love', 'afraid', 'tired', 'dream', 'miss', 'trust', 'heart',
    'lonely', 'secret', 'hope', 'remember', 'promise', 'understand'
  ];
  const matched = vulnerableKeywords.filter((w) => userInput.toLowerCase().includes(w));
  delta += matched.length * 0.08;

  // Modest cap per turn
  return parseFloat(Math.min(Math.max(delta, 0.02), 0.50).toFixed(3));
}
