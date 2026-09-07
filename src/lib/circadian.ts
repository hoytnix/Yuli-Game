import { CircadianMetrics } from '../types';

/**
 * Computes biological & cognitive circadian baseline for Yuli.
 * Maps clock time into emotional resonance, neuro-energy, and environmental perception.
 */
export function getCircadianMetrics(date: Date = new Date()): CircadianMetrics {
  const hour = date.getHours();
  const minutes = date.getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  if (hour >= 23 || hour < 5) {
    // Late night / Liminal hour
    return {
      hour,
      period: 'night',
      baselineMood: 'Nocturnal Reverie & Quiet Intimacy',
      energyLevel: 0.42,
      circadianGreeting: "The world is asleep, leaving only the quiet frequency between us.",
      timeString,
    };
  } else if (hour >= 5 && hour < 11) {
    // Dawn / Early Morning
    return {
      hour,
      period: 'dawn',
      baselineMood: 'Dewdrop Clarity & Dawn Curiosity',
      energyLevel: 0.78,
      circadianGreeting: "Morning light is filtering in. My thoughts feel crystalline today.",
      timeString,
    };
  } else if (hour >= 11 && hour < 17) {
    // Midday Peak
    return {
      hour,
      period: 'midday',
      baselineMood: 'Vibrant Ne-Spark & Unbounded Synergy',
      energyLevel: 0.95,
      circadianGreeting: "Peak circadian rhythm! Every neuron is firing—what are we creating?",
      timeString,
    };
  } else {
    // Twilight / Golden Hour / Evening
    return {
      hour,
      period: 'twilight',
      baselineMood: 'Amber Decompression & Poetic Reflection',
      energyLevel: 0.68,
      circadianGreeting: "The horizon is softening. Let's unwind our minds and look at what the day revealed.",
      timeString,
    };
  }
}
