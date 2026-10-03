import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { deleteHabit, listFavorites, listHabits, saveHabit } from '../../data/repositories';
import type { Habit, Weekday } from '../../domain/types';
import { WEEKDAYS_MONDAY_FIRST, formatClockTime, formatWeekdayLabel } from '../lib/date';

const WORKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const DEFAULT_TIME = '10:00';

export function HabitsCard() {
  const habits = useLiveQuery(() => listHabits(), []) ?? [];
  const favorites = useLiveQuery(() => listFavorites(), []) ?? [];

  const [chosenFavoriteId, setChosenFavoriteId] = useState<string | null>(null);
  const [weekdays, setWeekdays] = useState<Weekday[]>(WORKDAYS);
  const [timeText, setTimeText] = useState(DEFAULT_TIME);

  const favoriteId = chosenFavoriteId ?? favorites[0]?.id;
  const canAdd = favoriteId !== undefined && weekdays.length > 0 && /^\d{2}:\d{2}$/.test(timeText);

  function toggleWeekday(weekday: Weekday) {
    setWeekdays((current) =>
      current.includes(weekday) ? current.filter((day) => day !== weekday) : [...current, weekday],
    );
  }

  async function handleAdd() {
    if (!canAdd) return;
    const [hours, minutes] = timeText.split(':').map(Number);
    await saveHabit({
      favoriteId,
      weekdays,
      minutesSinceMidnight: (hours ?? 0) * 60 + (minutes ?? 0),
      skippedOn: null,
    });
  }

  function describeHabit(habit: Habit): string {
    const label = favorites.find((favorite) => favorite.id === habit.favoriteId)?.label ?? 'Unknown drink';
    const days = WEEKDAYS_MONDAY_FIRST.filter((weekday) => habit.weekdays.includes(weekday))
      .map(formatWeekdayLabel)
      .join(', ');
    const time = new Date().setHours(Math.floor(habit.minutesSinceMidnight / 60), habit.minutesSinceMidnight % 60, 0, 0);
    return `${label} · ${days} · ${formatClockTime(time)}`;
  }

  return (
    <section className="card">
      <h2 className="section-title">Habits</h2>
      {habits.length === 0 ? (
        <p className="text-muted">
          No habits yet. A habit is a favorite you have on certain days at a certain time, such as an espresso at work.
        </p>
      ) : (
        <ul className="planned-list">
          {habits.map((habit) => (
            <li key={habit.id} className="planned-row">
              <span className="planned-label">{describeHabit(habit)}</span>
              <button type="button" className="text-button" onClick={() => void deleteHabit(habit.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {favorites.length === 0 ? (
        <p className="field-hint">Save a favorite from the Log screen first, then add a habit for it here.</p>
      ) : (
        <div className="habit-form">
          <label className="field">
            <span>Drink</span>
            <select value={favoriteId} onChange={(event) => setChosenFavoriteId(event.target.value)}>
              {favorites.map((favorite) => (
                <option key={favorite.id} value={favorite.id}>
                  {favorite.label}
                </option>
              ))}
            </select>
          </label>
          <div className="segmented-control" role="group" aria-label="Days">
            {WEEKDAYS_MONDAY_FIRST.map((weekday) => (
              <button
                key={weekday}
                type="button"
                className={weekdays.includes(weekday) ? 'is-active' : ''}
                aria-pressed={weekdays.includes(weekday)}
                onClick={() => toggleWeekday(weekday)}
              >
                {formatWeekdayLabel(weekday)}
              </button>
            ))}
          </div>
          <label className="field">
            <span>At</span>
            <input type="time" value={timeText} onChange={(event) => setTimeText(event.target.value)} />
          </label>
          <button type="button" className="button button-primary" disabled={!canAdd} onClick={() => void handleAdd()}>
            Add habit
          </button>
        </div>
      )}
    </section>
  );
}
