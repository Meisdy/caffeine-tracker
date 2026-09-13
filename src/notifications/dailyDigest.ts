import { database } from '../data/database';
import { classifyTodayIntake, rollingDailyStats, totalMgOnDay } from '../domain/baseline';
import { DAY_MS, weekdayOf } from '../domain/time';
import { toleranceState, withdrawalRisk } from '../domain/tolerance';

export interface DigestNotification {
  title: string;
  body: string;
}

const HISTORY_WINDOW_DAYS = 30;
const HIGH_TOLERANCE_INDEX = 0.75;

/**
 * Built from stored data alone so it can run inside the service worker, where
 * there is no React tree and no live profile in memory.
 *
 * Returns null when there is nothing worth interrupting someone for — a digest
 * that fires every day regardless of content trains people to dismiss it.
 */
export async function buildDailyDigest(nowMs: number): Promise<DigestNotification | null> {
  const settings = await database.settings.get('settings');
  const intakes = await database.intakes
    .where('takenAt')
    .between(nowMs - HISTORY_WINDOW_DAYS * DAY_MS, nowMs)
    .toArray();

  const todayTotalMg = totalMgOnDay(intakes, nowMs);
  const baseline = rollingDailyStats(intakes, nowMs, HISTORY_WINDOW_DAYS);
  const tolerance = toleranceState(intakes, nowMs);
  const deviation = classifyTodayIntake(todayTotalMg, baseline, weekdayOf(nowMs));
  const risk = withdrawalRisk(todayTotalMg, tolerance);

  if (settings?.notifyUnusualIntake !== false) {
    if (risk === 'likely') {
      return {
        title: 'Well under your usual',
        body: `${Math.round(todayTotalMg)} mg today against a habit of about ${Math.round(
          tolerance.weightedDailyMg,
        )} mg. Withdrawal headache usually shows up 12 to 24 hours after the drop.`,
      };
    }
    if (deviation === 'unusuallyHigh') {
      return {
        title: 'Higher than usual today',
        body: `${Math.round(todayTotalMg)} mg, well above your typical ${weekdayName(
          nowMs,
        )}. Worth checking your bedtime projection.`,
      };
    }
    if (deviation === 'unusuallyLow') {
      return {
        title: 'Lower than usual today',
        body: `${Math.round(todayTotalMg)} mg, noticeably below your typical ${weekdayName(
          nowMs,
        )}. Watch for a headache later.`,
      };
    }
  }

  if (settings?.notifyToleranceAdvice !== false && tolerance.index >= HIGH_TOLERANCE_INDEX) {
    return {
      title: 'Tolerance is running high',
      body: `Averaging about ${Math.round(
        tolerance.weightedDailyMg,
      )} mg a day. Seven to ten days at a reduced dose restores most of your sensitivity.`,
    };
  }

  return null;
}

function weekdayName(atMs: number): string {
  return new Date(atMs).toLocaleDateString(undefined, { weekday: 'long' });
}
