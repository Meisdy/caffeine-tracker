import {
  CRASH_LOOKBACK_HOURS,
  CRASH_PEAK_MULTIPLE,
  CRASH_SLOPE_MG_PER_L_PER_HOUR,
  EFFECT_THRESHOLD_MG_PER_L,
  FADING_THRESHOLD_MULTIPLE,
  FLAT_SLOPE_MG_PER_L_PER_HOUR,
  JITTER_THRESHOLD_MG_PER_L,
  TOLERANCE_EFFECT_THRESHOLD_SCALING,
  TOLERANCE_JITTER_THRESHOLD_SCALING,
} from './constants';
import { concentrationAt, peakBetween, slopeAt } from './pharmacokinetics';
import { HOUR_MS } from './time';
import type { Dose, PhaseName, PhaseReading, Profile, ToleranceState } from './types';

export const PHASE_LABELS: Record<PhaseName, string> = {
  clear: 'Clear',
  rising: 'Rising',
  peak: 'Peak',
  productive: 'Productive',
  fading: 'Fading',
  crashRisk: 'Crash risk',
  overloaded: 'Overloaded',
};

export const PHASE_DESCRIPTIONS: Record<PhaseName, string> = {
  clear: 'Little to no caffeine on board. Baseline alertness.',
  rising: 'Absorbing. Effects are still building.',
  peak: 'At or near the maximum level from what you drank.',
  productive: 'Well above your effect threshold and holding.',
  fading: 'Dropping toward your effect threshold. The window is closing.',
  crashRisk: 'Falling fast from a high peak. Expect a noticeable dip.',
  overloaded: 'High enough that jitteriness and a raised heart rate are likely.',
};

export function effectThresholdFor(tolerance: ToleranceState): number {
  return EFFECT_THRESHOLD_MG_PER_L * (1 + tolerance.index * TOLERANCE_EFFECT_THRESHOLD_SCALING);
}

export function jitterThresholdFor(tolerance: ToleranceState): number {
  return JITTER_THRESHOLD_MG_PER_L * (1 + tolerance.index * TOLERANCE_JITTER_THRESHOLD_SCALING);
}

export function phaseAt(
  doses: readonly Dose[],
  atMs: number,
  profile: Profile,
  tolerance: ToleranceState,
): PhaseReading {
  const concentration = concentrationAt(doses, atMs, profile);
  const slope = slopeAt(doses, atMs, profile);
  const recentPeak = peakBetween(doses, atMs - CRASH_LOOKBACK_HOURS * HOUR_MS, atMs, profile);

  return {
    phase: classifyPhase(concentration, slope, recentPeak, tolerance),
    concentrationMgPerL: concentration,
    slopeMgPerLPerHour: slope,
  };
}

/**
 * Phase depends on the slope as well as the level: a crash is defined by
 * falling fast from a height, which a level-only rule cannot see.
 */
function classifyPhase(
  concentration: number,
  slope: number,
  recentPeak: number,
  tolerance: ToleranceState,
): PhaseName {
  const effectThreshold = effectThresholdFor(tolerance);

  if (concentration >= jitterThresholdFor(tolerance)) return 'overloaded';

  const isFallingSteeply = slope <= CRASH_SLOPE_MG_PER_L_PER_HOUR;
  const cameFromHigh = recentPeak >= effectThreshold * CRASH_PEAK_MULTIPLE;
  if (isFallingSteeply && cameFromHigh) return 'crashRisk';

  if (concentration < effectThreshold) return 'clear';

  if (slope > FLAT_SLOPE_MG_PER_L_PER_HOUR) return 'rising';
  if (slope >= -FLAT_SLOPE_MG_PER_L_PER_HOUR) return 'peak';
  if (concentration < effectThreshold * FADING_THRESHOLD_MULTIPLE) return 'fading';
  return 'productive';
}
