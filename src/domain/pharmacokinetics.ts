import { ABSORPTION_RATE_PER_HOUR, ORAL_BIOAVAILABILITY } from './constants';
import { eliminationRatePerHour, volumeOfDistributionLitres } from './halfLife';
import { MINUTE_MS, hoursBetween } from './time';
import type { CurvePoint, Dose, Profile } from './types';

/**
 * One-compartment model with first-order absorption (the Bateman function):
 *
 *   C(t) = (dose / Vd) · ka/(ka − ke) · (e^(−ke·t) − e^(−ka·t))
 *
 * Doses superpose linearly. Caffeine is mildly non-linear at high doses, so
 * this understates concentrations above roughly 600 mg — documented in README.
 */

export function singleDoseConcentration(
  doseMg: number,
  hoursSinceIntake: number,
  eliminationRate: number,
  volumeLitres: number,
): number {
  if (hoursSinceIntake <= 0) return 0;

  const absorptionRate = ABSORPTION_RATE_PER_HOUR;
  const peakScale = absorptionRate / (absorptionRate - eliminationRate);
  const decayed =
    Math.exp(-eliminationRate * hoursSinceIntake) - Math.exp(-absorptionRate * hoursSinceIntake);

  return ((ORAL_BIOAVAILABILITY * doseMg) / volumeLitres) * peakScale * decayed;
}

export function concentrationAt(
  doses: readonly Dose[],
  atMs: number,
  profile: Profile,
): number {
  const eliminationRate = eliminationRatePerHour(profile);
  const volumeLitres = volumeOfDistributionLitres(profile);

  return doses.reduce(
    (total, dose) =>
      total +
      singleDoseConcentration(
        dose.caffeineMg,
        hoursBetween(dose.takenAt, atMs),
        eliminationRate,
        volumeLitres,
      ),
    0,
  );
}

/** Analytic derivative of the curve above, in mg/L per hour. */
export function slopeAt(doses: readonly Dose[], atMs: number, profile: Profile): number {
  const eliminationRate = eliminationRatePerHour(profile);
  const volumeLitres = volumeOfDistributionLitres(profile);
  const absorptionRate = ABSORPTION_RATE_PER_HOUR;
  const peakScale = absorptionRate / (absorptionRate - eliminationRate);

  return doses.reduce((total, dose) => {
    const elapsedHours = hoursBetween(dose.takenAt, atMs);
    if (elapsedHours <= 0) return total;

    const rateOfChange =
      absorptionRate * Math.exp(-absorptionRate * elapsedHours) -
      eliminationRate * Math.exp(-eliminationRate * elapsedHours);

    return total + ((ORAL_BIOAVAILABILITY * dose.caffeineMg) / volumeLitres) * peakScale * rateOfChange;
  }, 0);
}

export function curveOverWindow(
  doses: readonly Dose[],
  fromMs: number,
  toMs: number,
  stepMinutes: number,
  profile: Profile,
): CurvePoint[] {
  if (stepMinutes <= 0) throw new Error('stepMinutes must be positive');

  const stepMs = stepMinutes * MINUTE_MS;
  const points: CurvePoint[] = [];
  for (let at = fromMs; at <= toMs; at += stepMs) {
    points.push({ at, concentrationMgPerL: concentrationAt(doses, at, profile) });
  }
  return points;
}

export function peakBetween(
  doses: readonly Dose[],
  fromMs: number,
  toMs: number,
  profile: Profile,
): number {
  return peakPointBetween(doses, fromMs, toMs, profile).concentrationMgPerL;
}

/** The highest point of the curve in the window, and when it happens. */
export function peakPointBetween(
  doses: readonly Dose[],
  fromMs: number,
  toMs: number,
  profile: Profile,
): CurvePoint {
  return curveOverWindow(doses, fromMs, toMs, 5, profile).reduce<CurvePoint>(
    (highest, point) => (point.concentrationMgPerL > highest.concentrationMgPerL ? point : highest),
    { at: fromMs, concentrationMgPerL: 0 },
  );
}
