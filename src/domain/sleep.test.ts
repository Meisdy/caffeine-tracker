import { describe, expect, it } from 'vitest';
import {
  bedtimeAfter,
  cutoffWindow,
  latestSafeIntakeTime,
  projectedSleepLevel,
  timeUntilBelow,
} from './sleep';
import { makeIntake, makeProfile } from './testFixtures';
import { HOUR_MS } from './time';

const profile = makeProfile();
const morning = new Date('2026-01-15T08:00:00').getTime();
const bedtime = new Date('2026-01-15T23:00:00').getTime();

describe('bedtimeAfter', () => {
  it('returns tonight when bedtime is still ahead', () => {
    expect(bedtimeAfter(profile, morning)).toBe(bedtime);
  });

  it('rolls to the next night once bedtime has passed', () => {
    const afterMidnight = new Date('2026-01-16T00:30:00').getTime();
    const nextNight = new Date('2026-01-16T23:00:00').getTime();
    expect(bedtimeAfter(profile, afterMidnight)).toBe(nextNight);
  });

  it('honours a per-weekday schedule', () => {
    // 2026-01-15 is a Thursday, so the Friday entry governs the following night.
    const lateOnFriday = makeProfile({
      bedtimeByWeekday: { 0: 1380, 1: 1380, 2: 1380, 3: 1380, 4: 1380, 5: 1500, 6: 1380 },
    });
    const fridayEvening = new Date('2026-01-16T20:00:00').getTime();
    const oneInTheMorning = new Date('2026-01-17T01:00:00').getTime();

    expect(bedtimeAfter(lateOnFriday, fridayEvening)).toBe(oneInTheMorning);
  });
});

describe('latestSafeIntakeTime', () => {
  it('is earlier for a larger dose', () => {
    const small = latestSafeIntakeTime([], 80, profile, morning, bedtime);
    const large = latestSafeIntakeTime([], 250, profile, morning, bedtime);

    expect(small).not.toBeNull();
    expect(large).not.toBeNull();
    expect(large as number).toBeLessThan(small as number);
  });

  it('is earlier when caffeine is already on board', () => {
    const onEmpty = latestSafeIntakeTime([], 80, profile, morning, bedtime);
    const afterALargeCoffee = latestSafeIntakeTime(
      [makeIntake(morning, 200)],
      80,
      profile,
      morning,
      bedtime,
    );

    expect(afterALargeCoffee as number).toBeLessThan(onEmpty as number);
  });

  it('returns null when even drinking right now breaches the threshold', () => {
    const lateEvening = new Date('2026-01-15T22:30:00').getTime();
    expect(latestSafeIntakeTime([], 300, profile, lateEvening, bedtime)).toBeNull();
  });

  it('allows any time up to bedtime for a dose too small to matter', () => {
    expect(latestSafeIntakeTime([], 1, profile, morning, bedtime)).toBe(bedtime);
  });

  it('returns a time whose projected sleep level sits under the threshold', () => {
    const cutoff = latestSafeIntakeTime([], 120, profile, morning, bedtime);
    expect(cutoff).not.toBeNull();

    const level = projectedSleepLevel(
      [{ takenAt: cutoff as number, caffeineMg: 120 }],
      profile,
      bedtime,
    );
    expect(level).toBeLessThanOrEqual(profile.sleepDisruptionThresholdMgPerL);
  });

  it('returns null once bedtime has already passed', () => {
    expect(latestSafeIntakeTime([], 80, profile, bedtime + HOUR_MS, bedtime)).toBeNull();
  });
});

describe('cutoffWindow', () => {
  it('brackets the point estimate, with a slower metabolism cutting off earlier', () => {
    const { earliest, estimate, latest } = cutoffWindow([], 120, profile, morning, bedtime);

    expect(earliest).not.toBeNull();
    expect(estimate).not.toBeNull();
    expect(latest).not.toBeNull();
    expect(earliest as number).toBeLessThan(estimate as number);
    expect(estimate as number).toBeLessThan(latest as number);
  });

  it('agrees with the point estimate from latestSafeIntakeTime', () => {
    const { estimate } = cutoffWindow([], 120, profile, morning, bedtime);
    expect(estimate).toBe(latestSafeIntakeTime([], 120, profile, morning, bedtime));
  });

  it('collapses to bedtime at every half-life for a negligible dose', () => {
    const { earliest, estimate, latest } = cutoffWindow([], 1, profile, morning, bedtime);
    expect([earliest, estimate, latest]).toEqual([bedtime, bedtime, bedtime]);
  });
});

describe('timeUntilBelow', () => {
  it('is zero when already under the threshold', () => {
    expect(timeUntilBelow([], 1, profile, morning)).toBe(0);
  });

  // Measured from the peak rather than the moment of drinking: a minute in,
  // almost nothing has been absorbed and the level is legitimately still low.
  const atPeak = morning + HOUR_MS;

  it('grows with the size of the dose', () => {
    const afterSmall = timeUntilBelow([makeIntake(morning, 100)], 1, profile, atPeak);
    const afterLarge = timeUntilBelow([makeIntake(morning, 300)], 1, profile, atPeak);

    expect(afterSmall).not.toBeNull();
    expect(afterLarge as number).toBeGreaterThan(afterSmall as number);
  });

  it('returns null when the level stays above the threshold past the horizon', () => {
    expect(timeUntilBelow([makeIntake(morning, 500)], 1, profile, atPeak, 2)).toBeNull();
  });
});
