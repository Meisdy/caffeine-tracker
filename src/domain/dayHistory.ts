import { totalMgOnDay } from './baseline';
import { MAX_HALF_LIFE_HOURS, SLEEP_ONSET_WINDOW_HOURS } from './constants';
import { peakPointBetween } from './pharmacokinetics';
import { projectedSleepLevel } from './sleep';
import { DAY_MS, HOUR_MS, MINUTE_MS, localDayKey, startOfLocalDay, weekdayOf } from './time';
import type { CurvePoint, Intake, Profile, ProfileSnapshot } from './types';

/**
 * How far before a day to load intakes so the evening before still shows up in
 * its morning. Five half-lives at the slowest clamped metabolism leave about 3%.
 */
export const CARRY_OVER_HOURS = 5 * MAX_HALF_LIFE_HOURS;

export interface DayWindow {
  fromMs: number;
  toMs: number;
  bedtimeAt: number;
}

/**
 * Local midnight to whichever comes later: the next midnight, or the end of
 * that night's sleep onset, since a bedtime after midnight still belongs to
 * the day it follows and the sleep judgement covers the onset window.
 */
export function dayWindow(profile: Profile, dayStartMs: number): DayWindow {
  // Anchoring at noon keeps the next day right across daylight-saving changes.
  const nextDayStart = startOfLocalDay(dayStartMs + DAY_MS + 12 * HOUR_MS);
  const bedtimeAt = dayStartMs + profile.bedtimeByWeekday[weekdayOf(dayStartMs)] * MINUTE_MS;
  const sleepOnsetEnd = bedtimeAt + SLEEP_ONSET_WINDOW_HOURS * HOUR_MS;
  return { fromMs: dayStartMs, toMs: Math.max(nextDayStart, sleepOnsetEnd), bedtimeAt };
}

export interface DaySummary {
  totalMg: number;
  peak: CurvePoint;
  sleepLevelMgPerL: number;
  isOverSleepThreshold: boolean;
}

export function summarizeDay(intakes: readonly Intake[], profile: Profile, window: DayWindow): DaySummary {
  const sleepLevelMgPerL = projectedSleepLevel(intakes, profile, window.bedtimeAt);
  return {
    totalMg: totalMgOnDay(intakes, window.fromMs),
    peak: peakPointBetween(intakes, window.fromMs, window.toMs, profile),
    sleepLevelMgPerL,
    isOverSleepThreshold: sleepLevelMgPerL > profile.sleepDisruptionThresholdMgPerL,
  };
}

/**
 * The profile that applied on the given day.
 *
 * Days before the oldest snapshot get that oldest one: it is the earliest
 * known state, and closer to what applied back then than today's profile.
 * Null only when nothing has been recorded at all.
 */
export function profileOnDay(snapshots: readonly ProfileSnapshot[], dayStartMs: number): Profile | null {
  const dayKey = localDayKey(dayStartMs);
  const byDay = [...snapshots].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const inEffect = byDay.filter((snapshot) => snapshot.effectiveFrom <= dayKey).at(-1) ?? byDay[0];
  return inEffect?.profile ?? null;
}
