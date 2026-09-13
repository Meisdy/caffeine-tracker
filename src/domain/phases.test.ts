import { describe, expect, it } from 'vitest';
import { effectThresholdFor, phaseAt } from './phases';
import { makeIntake, makeProfile } from './testFixtures';
import { HOUR_MS, MINUTE_MS } from './time';
import type { ToleranceState } from './types';

const profile = makeProfile();
const noon = new Date('2026-01-15T12:00:00').getTime();
const noTolerance: ToleranceState = { weightedDailyMg: 0, index: 0 };

describe('phaseAt', () => {
  it('reports clear with nothing on board', () => {
    expect(phaseAt([], noon, profile, noTolerance).phase).toBe('clear');
  });

  it('reports rising during absorption', () => {
    const intakes = [makeIntake(noon, 120)];
    expect(phaseAt(intakes, noon + 15 * MINUTE_MS, profile, noTolerance).phase).toBe('rising');
  });

  it('reports peak at the top of the curve', () => {
    const intakes = [makeIntake(noon, 120)];
    expect(phaseAt(intakes, noon + 45 * MINUTE_MS, profile, noTolerance).phase).toBe('peak');
  });

  it('reports overloaded for a very large dose', () => {
    const intakes = [makeIntake(noon, 700)];
    expect(phaseAt(intakes, noon + 45 * MINUTE_MS, profile, noTolerance).phase).toBe('overloaded');
  });

  it('reports a crash while falling steeply from a high peak', () => {
    const intakes = [makeIntake(noon, 400)];
    expect(phaseAt(intakes, noon + 2 * HOUR_MS, profile, noTolerance).phase).toBe('crashRisk');
  });

  it('does not call a gentle decline a crash', () => {
    const intakes = [makeIntake(noon, 90)];
    const reading = phaseAt(intakes, noon + 4 * HOUR_MS, profile, noTolerance);

    expect(reading.slopeMgPerLPerHour).toBeLessThan(0);
    expect(reading.phase).not.toBe('crashRisk');
  });

  it('carries the concentration and slope alongside the label', () => {
    const reading = phaseAt([makeIntake(noon, 100)], noon + HOUR_MS, profile, noTolerance);
    expect(reading.concentrationMgPerL).toBeGreaterThan(0);
    expect(Number.isFinite(reading.slopeMgPerLPerHour)).toBe(true);
  });
});

describe('effectThresholdFor', () => {
  it('raises the bar for a tolerant drinker', () => {
    const tolerant: ToleranceState = { weightedDailyMg: 400, index: 1 };
    expect(effectThresholdFor(tolerant)).toBeGreaterThan(effectThresholdFor(noTolerance));
  });
});
