import { useEffect, useRef, useState } from 'react';
import type { Habit } from '../../data/entities';
import { formatTimeOfDay } from '../lib/date';

const LOGGED_FEEDBACK_MS = 1500;

interface HabitGridProps {
  habits: Habit[];
  /** While editing, a tap offers to delete the habit instead of logging it. */
  isEditing: boolean;
  onLogHabit: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
}

export function HabitGrid({ habits, isEditing, onLogHabit, onDeleteHabit }: HabitGridProps) {
  const [justLoggedId, setJustLoggedId] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearFeedbackTimeout(), []);

  function clearFeedbackTimeout() {
    if (feedbackTimeoutRef.current !== null) clearTimeout(feedbackTimeoutRef.current);
  }

  // A tap logs instantly with no navigation, so without this it reads as a tap that did nothing.
  function handleTap(habit: Habit) {
    onLogHabit(habit);
    clearFeedbackTimeout();
    setJustLoggedId(habit.id);
    feedbackTimeoutRef.current = setTimeout(() => setJustLoggedId(null), LOGGED_FEEDBACK_MS);
  }

  function requestDelete(habit: Habit) {
    if (!window.confirm(`Delete habit ${habit.label}? Past intakes stay in History.`)) return;
    onDeleteHabit(habit);
  }

  if (habits.length === 0) {
    return <p className="text-muted">No habits yet — save one from the Log screen.</p>;
  }

  return (
    <div className="favorite-grid">
      {habits.map((habit) => {
        if (isEditing) {
          return (
            <button
              key={habit.id}
              type="button"
              className="favorite-tile is-editing"
              aria-label={`Delete ${habit.label}`}
              onClick={() => requestDelete(habit)}
            >
              <span className="favorite-tile-delete" aria-hidden="true">
                ✕
              </span>
              <span className="favorite-tile-label">{habit.label}</span>
              <span className="favorite-tile-dose">
                {habit.caffeineMg.toFixed(0)} mg · {formatTimeOfDay(habit.timeOfDayMinutes)}
              </span>
            </button>
          );
        }

        const isJustLogged = habit.id === justLoggedId;
        return (
          <button
            key={habit.id}
            type="button"
            className={isJustLogged ? 'favorite-tile is-logged' : 'favorite-tile'}
            onClick={() => handleTap(habit)}
          >
            <span className="favorite-tile-label">{habit.label}</span>
            <span className="favorite-tile-dose" aria-live="polite">
              {isJustLogged
                ? `✓ Logged ${habit.caffeineMg.toFixed(0)} mg`
                : `${habit.caffeineMg.toFixed(0)} mg · ${formatTimeOfDay(habit.timeOfDayMinutes)}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
