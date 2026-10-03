import { describe, expect, it } from 'vitest';
import { simulateIntake } from './whatIf';
import { makeIntake, makeProfile } from './testFixtures';
import { HOUR_MS } from './time';

const profile = makeProfile();
const noon = new Date('2026-01-15T12:00:00').getTime();
const bedtime = new Date('2026-01-15T23:00:00').getTime();

describe('simulateIntake', () => {
  it('stays under the threshold for an early dose', () => {
    const result = simulateIntake([], { takenAt: noon, caffeineMg: 80 }, profile, noon, bedtime);

    expect(result.exceedsSleepThreshold).toBe(false);
    expect(result.sleepLevelMgPerL).toBeLessThan(profile.sleepDisruptionThresholdMgPerL);
  });

  it('exceeds the threshold for a late dose and reports a cutoff before it', () => {
    const takenAt = bedtime - HOUR_MS;
    const result = simulateIntake([], { takenAt, caffeineMg: 100 }, profile, noon, bedtime);

    expect(result.exceedsSleepThreshold).toBe(true);
    expect(result.safeUntil.estimate).not.toBeNull();
    expect(result.safeUntil.estimate!).toBeLessThan(takenAt);
  });

  it('counts caffeine already logged', () => {
    const takenAt = noon + 6 * HOUR_MS;
    const dose = { takenAt, caffeineMg: 80 };
    const alone = simulateIntake([], dose, profile, noon, bedtime);
    const afterHistory = simulateIntake([makeIntake(noon, 300)], dose, profile, noon, bedtime);

    expect(afterHistory.sleepLevelMgPerL).toBeGreaterThan(alone.sleepLevelMgPerL);
  });

  it('places the peak shortly after the intake', () => {
    const takenAt = noon + HOUR_MS;
    const result = simulateIntake([], { takenAt, caffeineMg: 100 }, profile, noon, bedtime);

    expect(result.peak.at).toBeGreaterThan(takenAt);
    expect(result.peak.at - takenAt).toBeLessThan(2 * HOUR_MS);
  });

  it('reports no cutoff once it is too late for any dose', () => {
    const late = bedtime - 10 * 60 * 1000;
    const result = simulateIntake([makeIntake(late - HOUR_MS, 400)], { takenAt: late, caffeineMg: 80 }, profile, late, bedtime);

    expect(result.safeUntil.estimate).toBeNull();
  });
});
