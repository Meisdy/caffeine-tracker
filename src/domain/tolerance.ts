import {
  TOLERANCE_HALF_LIFE_DAYS,
  TOLERANCE_SATURATION_MG_PER_DAY,
  TOLERANCE_WINDOW_DAYS,
  WITHDRAWAL_LIKELY_RATIO,
  WITHDRAWAL_MINIMUM_HABIT_MG_PER_DAY,
  WITHDRAWAL_POSSIBLE_RATIO,
} from './constants';
import { rollingDailyStats } from './baseline';
import type { Intake, ToleranceState, WithdrawalRisk } from './types';

/**
 * Tolerance as an exponentially weighted mean of recent daily intake.
 *
 * A proxy, not a measured receptor state: tolerance builds within a few days of
 * regular intake and fades over one to two weeks off, which an exponential
 * weighting with a one-week half-life approximates closely enough to be useful.
 */
export function toleranceState(intakes: readonly Intake[], nowMs: number): ToleranceState {
  const { dailyTotals } = rollingDailyStats(intakes, nowMs, TOLERANCE_WINDOW_DAYS);
  if (dailyTotals.length === 0) return { weightedDailyMg: 0, index: 0 };

  const mostRecentIndex = dailyTotals.length - 1;
  let weightedSum = 0;
  let weightTotal = 0;

  dailyTotals.forEach((entry, index) => {
    const daysAgo = mostRecentIndex - index;
    const weight = 0.5 ** (daysAgo / TOLERANCE_HALF_LIFE_DAYS);
    weightedSum += entry.totalMg * weight;
    weightTotal += weight;
  });

  const weightedDailyMg = weightTotal === 0 ? 0 : weightedSum / weightTotal;
  return {
    weightedDailyMg,
    index: Math.min(1, weightedDailyMg / TOLERANCE_SATURATION_MG_PER_DAY),
  };
}

/**
 * Withdrawal needs an established habit to withdraw from, so a light drinker
 * having a quiet day is never flagged.
 */
export function withdrawalRisk(todayTotalMg: number, tolerance: ToleranceState): WithdrawalRisk {
  if (tolerance.weightedDailyMg < WITHDRAWAL_MINIMUM_HABIT_MG_PER_DAY) return 'none';

  const ratio = todayTotalMg / tolerance.weightedDailyMg;
  if (ratio < WITHDRAWAL_LIKELY_RATIO) return 'likely';
  if (ratio < WITHDRAWAL_POSSIBLE_RATIO) return 'possible';
  return 'none';
}
