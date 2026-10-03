import { cutoffWindow, projectedSleepLevel } from './sleep';
import type { CutoffWindow } from './sleep';
import { peakPointBetween } from './pharmacokinetics';
import { HOUR_MS } from './time';
import type { CurvePoint, Dose, Profile } from './types';

// A single dose peaks about 45 minutes after intake; this leaves room for the
// peak of the combined curve to land later when earlier doses are still decaying.
const PEAK_SEARCH_HOURS = 3;

export interface WhatIfResult {
  /** Worst level across sleep onset if the dose were taken. */
  sleepLevelMgPerL: number;
  exceedsSleepThreshold: boolean;
  /** Highest point of the combined curve shortly after the hypothetical intake. */
  peak: CurvePoint;
  /** Independent of the chosen time: the latest this dose stays under the sleep threshold. */
  safeUntil: CutoffWindow;
}

export function simulateIntake(
  doses: readonly Dose[],
  hypotheticalDose: Dose,
  profile: Profile,
  nowMs: number,
  bedtimeMs: number,
): WhatIfResult {
  const withDose = [...doses, hypotheticalDose];
  const sleepLevelMgPerL = projectedSleepLevel(withDose, profile, bedtimeMs);

  return {
    sleepLevelMgPerL,
    exceedsSleepThreshold: sleepLevelMgPerL > profile.sleepDisruptionThresholdMgPerL,
    peak: peakPointBetween(
      withDose,
      hypotheticalDose.takenAt,
      hypotheticalDose.takenAt + PEAK_SEARCH_HOURS * HOUR_MS,
      profile,
    ),
    safeUntil: cutoffWindow(doses, hypotheticalDose.caffeineMg, profile, nowMs, bedtimeMs),
  };
}
