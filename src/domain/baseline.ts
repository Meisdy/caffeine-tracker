import { MINIMUM_DAYS_FOR_BASELINE, UNUSUAL_INTAKE_DEVIATIONS } from './constants';
import { DAY_MS, localDayKey, startOfLocalDay, weekdayOf } from './time';
import type {
  BaselineStats,
  DailyTotal,
  Intake,
  IntakeDeviation,
  Weekday,
} from './types';

export function totalMgOnDay(intakes: readonly Intake[], dayMs: number): number {
  const key = localDayKey(dayMs);
  return intakes
    .filter((intake) => localDayKey(intake.takenAt) === key)
    .reduce((total, intake) => total + intake.caffeineMg, 0);
}

/**
 * Daily totals across the window, zero-filled.
 *
 * Days with no intake must count as zero or the mean describes only the days
 * you drank something, which is exactly the wrong baseline for spotting a day
 * that is unusually low. The window starts at the first recorded intake so a
 * new user is not averaged against weeks of empty history.
 */
export function rollingDailyStats(
  intakes: readonly Intake[],
  nowMs: number,
  windowDays: number,
): BaselineStats {
  const dailyTotals = buildDailyTotals(intakes, nowMs, windowDays);
  const amounts = dailyTotals.map((entry) => entry.totalMg);
  const meanMgPerDay = mean(amounts);

  return {
    dailyTotals,
    meanMgPerDay,
    standardDeviationMg: standardDeviation(amounts, meanMgPerDay),
    meanByWeekday: meanByWeekday(dailyTotals),
    daysOfHistory: dailyTotals.length,
  };
}

/**
 * Compares today against the same weekday where possible — a Tuesday baseline
 * describes a Tuesday far better than an all-days average does.
 */
export function classifyTodayIntake(
  todayTotalMg: number,
  baseline: BaselineStats,
  weekday: Weekday,
): IntakeDeviation {
  if (baseline.daysOfHistory < MINIMUM_DAYS_FOR_BASELINE) return 'insufficientHistory';

  const expected = baseline.meanByWeekday[weekday] ?? baseline.meanMgPerDay;
  const margin = UNUSUAL_INTAKE_DEVIATIONS * baseline.standardDeviationMg;
  if (margin === 0) return 'typical';

  if (todayTotalMg > expected + margin) return 'unusuallyHigh';
  if (todayTotalMg < expected - margin) return 'unusuallyLow';
  return 'typical';
}

function buildDailyTotals(
  intakes: readonly Intake[],
  nowMs: number,
  windowDays: number,
): DailyTotal[] {
  if (intakes.length === 0) return [];

  const windowStart = startOfLocalDay(nowMs) - (windowDays - 1) * DAY_MS;
  const earliestIntake = Math.min(...intakes.map((intake) => intake.takenAt));
  const firstDay = Math.max(windowStart, startOfLocalDay(earliestIntake));

  const totalsByDay = new Map<string, number>();
  for (const intake of intakes) {
    if (intake.takenAt < firstDay) continue;
    const key = localDayKey(intake.takenAt);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + intake.caffeineMg);
  }

  const totals: DailyTotal[] = [];
  for (let dayMs = firstDay; dayMs <= startOfLocalDay(nowMs); dayMs += DAY_MS) {
    const key = localDayKey(dayMs);
    totals.push({ day: key, totalMg: totalsByDay.get(key) ?? 0 });
  }
  return totals;
}

function meanByWeekday(dailyTotals: readonly DailyTotal[]): Record<Weekday, number | null> {
  const sums = new Map<Weekday, { total: number; count: number }>();

  for (const entry of dailyTotals) {
    const weekday = weekdayOf(new Date(`${entry.day}T00:00:00`).getTime());
    const running = sums.get(weekday) ?? { total: 0, count: 0 };
    sums.set(weekday, { total: running.total + entry.totalMg, count: running.count + 1 });
  }

  const averages = {} as Record<Weekday, number | null>;
  for (const weekday of [0, 1, 2, 3, 4, 5, 6] as const) {
    const running = sums.get(weekday);
    averages[weekday] = running ? running.total / running.count : null;
  }
  return averages;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: readonly number[], average: number): number {
  if (values.length === 0) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
