/**
 * Local-time *display* helpers for the screens.
 *
 * Day-boundary and weekday math already lives in `domain/time.ts` (shared with
 * the model, which must agree with the UI on what "today" means) — this file
 * only formats values for a human to read, and never a raw epoch timestamp.
 */

import { DAY_MS } from '../../domain/time';
import type { Weekday } from '../../domain/types';

const clockTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const weekdayLabelFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

/** Formats a `YYYY-MM-DD` day key (as produced by `localDayKey`) for display. */
export function formatDayKeyShort(dayKey: string): string {
  const [yearText, monthText, dayText] = dayKey.split('-');
  const year = Number(yearText ?? 0);
  const month = Number(monthText ?? 1);
  const day = Number(dayText ?? 1);
  return shortDateFormatter.format(new Date(year, month - 1, day));
}

export function formatClockTime(atMs: number): string {
  return clockTimeFormatter.format(atMs);
}

export function formatShortDate(atMs: number): string {
  return shortDateFormatter.format(atMs);
}

export function formatWeekdayLabel(weekday: Weekday): string {
  // 2023-01-01 was a Sunday (weekday 0); any date with a matching getDay() works.
  const referenceSundayMs = new Date(2023, 0, 1).getTime();
  return weekdayLabelFormatter.format(referenceSundayMs + weekday * DAY_MS);
}

/** Local `YYYY-MM-DDTHH:mm`, the value format `<input type="datetime-local">` expects. */
export function toDatetimeLocalValue(atMs: number): string {
  const date = new Date(atMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** Inverse of `toDatetimeLocalValue`; the input has no timezone, so it is read as local time. */
export function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}
