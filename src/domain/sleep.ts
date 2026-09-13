import { SLEEP_ONSET_WINDOW_HOURS } from './constants';
import { concentrationAt, curveOverWindow } from './pharmacokinetics';
import { DAY_MS, HOUR_MS, MINUTE_MS, startOfLocalDay, weekdayOf } from './time';
import type { Dose, Profile } from './types';

/** The next bedtime at or after `fromMs`, honouring the per-weekday schedule. */
export function bedtimeAfter(profile: Profile, fromMs: number): number {
  const todayBedtime =
    startOfLocalDay(fromMs) + profile.bedtimeByWeekday[weekdayOf(fromMs)] * MINUTE_MS;
  if (todayBedtime > fromMs) return todayBedtime;

  const tomorrow = startOfLocalDay(fromMs + DAY_MS);
  return tomorrow + profile.bedtimeByWeekday[weekdayOf(tomorrow)] * MINUTE_MS;
}

/**
 * The worst concentration across sleep onset, not the instant of bedtime.
 *
 * A coffee drunk minutes before bed has barely been absorbed at lights-out but
 * peaks while you are trying to fall asleep. Judging only the bedtime instant
 * would call that harmless — and would also make the cutoff search
 * non-monotonic, because concentration at a fixed later moment rises and then
 * falls as the intake time approaches it. Taking the maximum over the onset
 * window fixes both problems at once.
 */
export function projectedSleepLevel(
  doses: readonly Dose[],
  profile: Profile,
  bedtimeMs: number,
): number {
  return curveOverWindow(
    doses,
    bedtimeMs,
    bedtimeMs + SLEEP_ONSET_WINDOW_HOURS * HOUR_MS,
    10,
    profile,
  ).reduce((highest, point) => Math.max(highest, point.concentrationMgPerL), 0);
}

/**
 * The latest moment you can take `additionalDoseMg` and still be under your
 * sleep threshold through sleep onset. Null means it is already too late.
 *
 * Solved by bisection rather than in closed form: superposed doses make the
 * inverse ugly, while `projectedSleepLevel` is monotonic in the intake time,
 * which is all bisection needs.
 */
export function latestSafeIntakeTime(
  doses: readonly Dose[],
  additionalDoseMg: number,
  profile: Profile,
  fromMs: number,
  bedtimeMs: number,
): number | null {
  if (bedtimeMs <= fromMs) return null;

  const threshold = profile.sleepDisruptionThresholdMgPerL;
  const levelIfTakenAt = (takenAt: number): number =>
    projectedSleepLevel([...doses, { takenAt, caffeineMg: additionalDoseMg }], profile, bedtimeMs);

  if (levelIfTakenAt(fromMs) > threshold) return null;
  if (levelIfTakenAt(bedtimeMs) <= threshold) return bedtimeMs;

  let latestSafe = fromMs;
  let earliestUnsafe = bedtimeMs;
  while (earliestUnsafe - latestSafe > MINUTE_MS) {
    const midpoint = Math.floor((latestSafe + earliestUnsafe) / 2);
    if (levelIfTakenAt(midpoint) <= threshold) {
      latestSafe = midpoint;
    } else {
      earliestUnsafe = midpoint;
    }
  }
  return latestSafe;
}

/**
 * Milliseconds until the level falls to `thresholdMgPerL`, or null if it stays
 * above it for the whole search horizon.
 */
export function timeUntilBelow(
  doses: readonly Dose[],
  thresholdMgPerL: number,
  profile: Profile,
  fromMs: number,
  horizonHours = 24,
): number | null {
  if (concentrationAt(doses, fromMs, profile) <= thresholdMgPerL) return 0;

  const points = curveOverWindow(doses, fromMs, fromMs + horizonHours * HOUR_MS, 5, profile);
  const crossing = points.find((point) => point.concentrationMgPerL <= thresholdMgPerL);
  return crossing ? crossing.at - fromMs : null;
}
