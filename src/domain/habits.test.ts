import { describe, expect, it } from 'vitest';
import { pendingHabitsToday, plannedDoses } from './habits';
import { makeIntake } from './testFixtures';
import { HOUR_MS, localDayKey } from './time';
import type { Habit } from './types';

const thursdayMorning = new Date('2026-01-15T08:00:00').getTime();
const espresso = { id: 'fav-espresso', label: 'Espresso, work', caffeineMg: 64 };

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    favoriteId: espresso.id,
    weekdays: [1, 2, 3, 4, 5],
    minutesSinceMidnight: 10 * 60,
    skippedOn: null,
    ...overrides,
  };
}

describe('pendingHabitsToday', () => {
  it('lists a weekday habit scheduled for today', () => {
    const [entry] = pendingHabitsToday([makeHabit()], [espresso], [], thursdayMorning);

    expect(entry?.scheduledAt).toBe(new Date('2026-01-15T10:00:00').getTime());
    expect(entry?.caffeineMg).toBe(64);
  });

  it('ignores a habit that does not run on today’s weekday', () => {
    const weekendOnly = makeHabit({ weekdays: [0, 6] });

    expect(pendingHabitsToday([weekendOnly], [espresso], [], thursdayMorning)).toEqual([]);
  });

  it('drops a habit already logged near its time', () => {
    const logged = { ...makeIntake(thursdayMorning + 1.5 * HOUR_MS, 64), favoriteId: espresso.id };

    expect(pendingHabitsToday([makeHabit()], [espresso], [logged], thursdayMorning)).toEqual([]);
  });

  it('keeps a habit when only a different drink was logged', () => {
    const otherDrink = { ...makeIntake(thursdayMorning + 2 * HOUR_MS, 64), favoriteId: 'something-else' };

    expect(pendingHabitsToday([makeHabit()], [espresso], [otherDrink], thursdayMorning)).toHaveLength(1);
  });

  it('drops a habit skipped today but not one skipped on another day', () => {
    const skippedToday = makeHabit({ skippedOn: localDayKey(thursdayMorning) });
    const skippedYesterday = makeHabit({ skippedOn: '2026-01-14' });

    expect(pendingHabitsToday([skippedToday], [espresso], [], thursdayMorning)).toEqual([]);
    expect(pendingHabitsToday([skippedYesterday], [espresso], [], thursdayMorning)).toHaveLength(1);
  });

  it('ignores a habit whose favorite no longer exists', () => {
    expect(pendingHabitsToday([makeHabit()], [], [], thursdayMorning)).toEqual([]);
  });

  it('sorts by scheduled time', () => {
    const late = makeHabit({ id: 'late', minutesSinceMidnight: 15 * 60 });
    const early = makeHabit({ id: 'early', minutesSinceMidnight: 9 * 60 });

    const pending = pendingHabitsToday([late, early], [espresso], [], thursdayMorning);

    expect(pending.map((entry) => entry.habit.id)).toEqual(['early', 'late']);
  });
});

describe('plannedDoses', () => {
  it('keeps upcoming habits as doses and drops overdue ones', () => {
    const overdue = makeHabit({ id: 'overdue', minutesSinceMidnight: 7 * 60 });
    const upcoming = makeHabit({ id: 'upcoming' });
    const pending = pendingHabitsToday([overdue, upcoming], [espresso], [], thursdayMorning);

    expect(plannedDoses(pending, thursdayMorning)).toEqual([
      { takenAt: new Date('2026-01-15T10:00:00').getTime(), caffeineMg: 64 },
    ]);
  });
});
