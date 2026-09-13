import type { Weekday } from './types';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export function hoursBetween(fromMs: number, toMs: number): number {
  return (toMs - fromMs) / HOUR_MS;
}

export function startOfLocalDay(atMs: number): number {
  const date = new Date(atMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** `YYYY-MM-DD` in local time — the day boundary a person actually experiences. */
export function localDayKey(atMs: number): string {
  const date = new Date(atMs);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekdayOf(atMs: number): Weekday {
  return new Date(atMs).getDay() as Weekday;
}
