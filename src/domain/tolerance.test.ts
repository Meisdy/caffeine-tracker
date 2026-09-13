import { describe, expect, it } from 'vitest';
import { makeIntake } from './testFixtures';
import { DAY_MS, HOUR_MS, startOfLocalDay } from './time';
import { toleranceState, withdrawalRisk } from './tolerance';
import type { Intake } from './types';

const now = new Date('2026-01-15T18:00:00').getTime();

function habit(days: number, mgPerDay: number, endingDaysAgo = 0): Intake[] {
  const intakes: Intake[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
    const daysAgo = endingDaysAgo + dayIndex;
    intakes.push(makeIntake(startOfLocalDay(now) - daysAgo * DAY_MS + 8 * HOUR_MS, mgPerDay));
  }
  return intakes;
}

describe('toleranceState', () => {
  it('is zero with no history', () => {
    expect(toleranceState([], now)).toEqual({ weightedDailyMg: 0, index: 0 });
  });

  it('rises across a week of heavy intake', () => {
    const state = toleranceState(habit(7, 400), now);
    expect(state.weightedDailyMg).toBeGreaterThan(300);
    expect(state.index).toBeGreaterThan(0.75);
  });

  it('decays after a week away from a former habit', () => {
    const during = toleranceState(habit(14, 400), now);
    const afterABreak = toleranceState(habit(14, 400, 8), now);

    expect(afterABreak.weightedDailyMg).toBeLessThan(during.weightedDailyMg);
    expect(afterABreak.index).toBeLessThan(during.index);
  });

  it('saturates the index rather than exceeding one', () => {
    expect(toleranceState(habit(14, 2000), now).index).toBe(1);
  });
});

describe('withdrawalRisk', () => {
  it('ignores a quiet day for someone without a habit', () => {
    const light = toleranceState(habit(14, 40), now);
    expect(withdrawalRisk(0, light)).toBe('none');
  });

  it('flags a heavy drinker dropping to nothing', () => {
    const heavy = toleranceState(habit(14, 400), now);
    expect(withdrawalRisk(0, heavy)).toBe('likely');
  });

  it('flags a partial drop as possible', () => {
    const heavy = toleranceState(habit(14, 400), now);
    expect(withdrawalRisk(heavy.weightedDailyMg * 0.4, heavy)).toBe('possible');
  });

  it('says nothing when today matches the habit', () => {
    const heavy = toleranceState(habit(14, 400), now);
    expect(withdrawalRisk(heavy.weightedDailyMg, heavy)).toBe('none');
  });
});
