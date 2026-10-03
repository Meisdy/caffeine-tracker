import { localDayKey, MINUTE_MS, weekdayOf } from './time';
import type { Dose, Habit, Intake } from './types';

// An intake of the habit's favorite this close to the planned time counts as
// the habit having happened, so logging it a little early or late is not
// followed by a second, stale prompt.
const COMPLETION_WINDOW_MS = 2 * 60 * MINUTE_MS;

/** What a habit needs to know about its favorite; `Favorite` satisfies it. */
export interface HabitDoseSource {
  id: string;
  label: string;
  caffeineMg: number;
}

export interface PendingHabit {
  habit: Habit;
  label: string;
  caffeineMg: number;
  scheduledAt: number;
}

export function scheduledTimeOnDayOf(habit: Habit, dayMs: number): number {
  const date = new Date(dayMs);
  date.setHours(Math.floor(habit.minutesSinceMidnight / 60), habit.minutesSinceMidnight % 60, 0, 0);
  return date.getTime();
}

/**
 * Today's habits that are neither logged nor skipped, earliest first.
 * Includes ones already overdue, so the user can still confirm them.
 */
export function pendingHabitsToday(
  habits: readonly Habit[],
  favorites: readonly HabitDoseSource[],
  intakes: readonly Intake[],
  nowMs: number,
): PendingHabit[] {
  const todayKey = localDayKey(nowMs);
  const today = weekdayOf(nowMs);

  return habits
    .filter((habit) => habit.weekdays.includes(today) && habit.skippedOn !== todayKey)
    .flatMap((habit) => {
      const favorite = favorites.find((candidate) => candidate.id === habit.favoriteId);
      if (!favorite) return [];

      const scheduledAt = scheduledTimeOnDayOf(habit, nowMs);
      const isLogged = intakes.some(
        (intake) =>
          intake.favoriteId === habit.favoriteId && Math.abs(intake.takenAt - scheduledAt) <= COMPLETION_WINDOW_MS,
      );
      return isLogged ? [] : [{ habit, label: favorite.label, caffeineMg: favorite.caffeineMg, scheduledAt }];
    })
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/** Overdue habits are excluded: until confirmed, there is no evidence they will still happen. */
export function plannedDoses(pending: readonly PendingHabit[], nowMs: number): Dose[] {
  return pending
    .filter((entry) => entry.scheduledAt > nowMs)
    .map((entry) => ({ takenAt: entry.scheduledAt, caffeineMg: entry.caffeineMg }));
}
