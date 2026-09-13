import { describe, expect, it } from 'vitest';
import { alertnessFit } from './alertnessFit';
import { MINIMUM_RATINGS_FOR_ALERTNESS_FIT } from './constants';
import { HOUR_MS } from './time';
import type { AlertnessSample, Dose, Profile, ToleranceState } from './types';

const PROFILE: Profile = {
  weightKg: 70,
  age: 30,
  sex: 'other',
  modifiers: {
    smokes: false,
    usesOralContraceptives: false,
    pregnancy: 'none',
    liverImpairment: 'none',
  },
  bedtimeByWeekday: { 0: 1380, 1: 1380, 2: 1380, 3: 1380, 4: 1380, 5: 1380, 6: 1380 },
  sleepDisruptionThresholdMgPerL: 1,
  halfLifeOverrideHours: null,
};

const NO_TOLERANCE: ToleranceState = { weightedDailyMg: 0, index: 0 };

const MORNING = new Date('2026-01-05T08:00:00').getTime();

/** One 150 mg coffee per day, so each day has a clear peak and a clear trough. */
function dailyCoffees(dayCount: number): Dose[] {
  return Array.from({ length: dayCount }, (_, dayIndex) => ({
    takenAt: MORNING + dayIndex * 24 * HOUR_MS,
    caffeineMg: 150,
  }));
}

function rate(dayIndex: number, hoursAfterCoffee: number, rating: 1 | 2 | 3 | 4 | 5): AlertnessSample {
  return { ratedAt: MORNING + dayIndex * 24 * HOUR_MS + hoursAfterCoffee * HOUR_MS, rating };
}

describe('alertnessFit', () => {
  it('withholds a verdict until there are enough ratings', () => {
    const samples = Array.from({ length: MINIMUM_RATINGS_FOR_ALERTNESS_FIT - 1 }, (_, index) =>
      rate(index, 1, index % 2 === 0 ? 5 : 1),
    );

    const fit = alertnessFit(samples, dailyCoffees(samples.length), PROFILE, NO_TOLERANCE);

    expect(fit.correlation).toBeNull();
    expect(fit.agreement).toBe('unknown');
    expect(fit.ratingCount).toBe(MINIMUM_RATINGS_FOR_ALERTNESS_FIT - 1);
  });

  it('reports agreement when ratings are high on caffeine and low off it', () => {
    const samples: AlertnessSample[] = [];
    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      samples.push(rate(dayIndex, 1, 5));
      // 16 h after the dose, well over three half-lives, almost nothing is left.
      samples.push(rate(dayIndex, 16, 2));
    }

    const fit = alertnessFit(samples, dailyCoffees(5), PROFILE, NO_TOLERANCE);

    expect(fit.correlation).not.toBeNull();
    expect(fit.correlation ?? 0).toBeGreaterThan(0);
    expect(fit.agreement).toBe('tracksModel');
  });

  it('reports a contradiction when ratings run the other way', () => {
    const samples: AlertnessSample[] = [];
    for (let dayIndex = 0; dayIndex < 5; dayIndex += 1) {
      samples.push(rate(dayIndex, 1, 1));
      samples.push(rate(dayIndex, 16, 5));
    }

    const fit = alertnessFit(samples, dailyCoffees(5), PROFILE, NO_TOLERANCE);

    expect(fit.agreement).toBe('contradictsModel');
  });

  it('returns no correlation when every rating is identical', () => {
    const samples = Array.from({ length: 10 }, (_, index) => rate(index, index % 5, 3));

    const fit = alertnessFit(samples, dailyCoffees(10), PROFILE, NO_TOLERANCE);

    expect(fit.correlation).toBeNull();
    expect(fit.agreement).toBe('unknown');
  });

  it('splits ratings into bands by the level on board at the time', () => {
    // 150 mg in 42 L peaks near 3 mg/L, so one hour in is above the high band
    // boundary, eight hours in is mid-range, and sixteen hours in is spent.
    const samples: AlertnessSample[] = [rate(0, 1, 5), rate(0, 8, 4), rate(0, 16, 2)];

    const fit = alertnessFit(samples, dailyCoffees(1), PROFILE, NO_TOLERANCE);
    const meanByBand = Object.fromEntries(fit.bands.map((band) => [band.id, band.meanRating]));

    expect(meanByBand).toEqual({ high: 5, working: 4, low: 2 });
  });

  it('leaves a band empty rather than inventing a mean for it', () => {
    const fit = alertnessFit([rate(0, 8, 4)], dailyCoffees(1), PROFILE, NO_TOLERANCE);

    expect(fit.bands.find((band) => band.id === 'high')?.meanRating).toBeNull();
    expect(fit.bands.find((band) => band.id === 'high')?.ratingCount).toBe(0);
  });
});
