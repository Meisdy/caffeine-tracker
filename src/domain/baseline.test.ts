import { describe, expect, it } from 'vitest';
import { classifyTodayIntake, rollingDailyStats, totalMgOnDay } from './baseline';
import { makeIntake } from './testFixtures';
import { DAY_MS, HOUR_MS, startOfLocalDay, weekdayOf } from './time';
import type { Intake } from './types';

const now = new Date('2026-01-15T18:00:00').getTime();

function dailyHabit(days: number, mgPerDay: number): Intake[] {
  const intakes: Intake[] = [];
  for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
    intakes.push(makeIntake(startOfLocalDay(now) - dayIndex * DAY_MS + 8 * HOUR_MS, mgPerDay));
  }
  return intakes;
}

describe('totalMgOnDay', () => {
  it('sums only the drinks on that local day', () => {
    const intakes = [
      makeIntake(startOfLocalDay(now) + 8 * HOUR_MS, 80),
      makeIntake(startOfLocalDay(now) + 14 * HOUR_MS, 120),
      makeIntake(startOfLocalDay(now) - DAY_MS + 9 * HOUR_MS, 200),
    ];
    expect(totalMgOnDay(intakes, now)).toBe(200);
  });
});

describe('rollingDailyStats', () => {
  it('reports nothing without any intake', () => {
    const stats = rollingDailyStats([], now, 30);
    expect(stats.daysOfHistory).toBe(0);
    expect(stats.meanMgPerDay).toBe(0);
  });

  it('zero-fills days with no intake rather than skipping them', () => {
    const intakes = [
      makeIntake(startOfLocalDay(now) - 2 * DAY_MS + 8 * HOUR_MS, 300),
      makeIntake(startOfLocalDay(now) + 8 * HOUR_MS, 0),
    ];
    const stats = rollingDailyStats(intakes, now, 30);

    expect(stats.daysOfHistory).toBe(3);
    expect(stats.meanMgPerDay).toBeCloseTo(100, 5);
  });

  it('starts the window at the first recorded intake', () => {
    const stats = rollingDailyStats(dailyHabit(5, 200), now, 30);
    expect(stats.daysOfHistory).toBe(5);
    expect(stats.meanMgPerDay).toBeCloseTo(200, 5);
    expect(stats.standardDeviationMg).toBeCloseTo(0, 5);
  });
});

describe('classifyTodayIntake', () => {
  it('stays silent until there is enough history', () => {
    const stats = rollingDailyStats(dailyHabit(5, 200), now, 30);
    expect(classifyTodayIntake(900, stats, weekdayOf(now))).toBe('insufficientHistory');
  });

  it('calls a steady habit typical', () => {
    const intakes = dailyHabit(20, 200);
    const stats = rollingDailyStats(intakes, now, 30);
    expect(classifyTodayIntake(200, stats, weekdayOf(now))).toBe('typical');
  });

  it('flags a day far above and far below the baseline', () => {
    const intakes = dailyHabit(20, 200);
    // Vary one day so the standard deviation is non-zero and comparisons mean something.
    intakes.push(makeIntake(startOfLocalDay(now) - 3 * DAY_MS + 15 * HOUR_MS, 100));
    const stats = rollingDailyStats(intakes, now, 30);

    expect(classifyTodayIntake(900, stats, weekdayOf(now))).toBe('unusuallyHigh');
    expect(classifyTodayIntake(0, stats, weekdayOf(now))).toBe('unusuallyLow');
  });
});
