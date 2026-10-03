import type { PendingHabit } from '../../domain/habits';
import { formatClockTime } from '../lib/date';

interface PlannedTodayCardProps {
  pending: PendingHabit[];
  nowMs: number;
  countInForecast: boolean;
  onToggleCountInForecast: (isCounted: boolean) => void;
  onLog: (entry: PendingHabit) => void;
  onSkip: (entry: PendingHabit) => void;
}

export function PlannedTodayCard({
  pending,
  nowMs,
  countInForecast,
  onToggleCountInForecast,
  onLog,
  onSkip,
}: PlannedTodayCardProps) {
  if (pending.length === 0) return null;

  return (
    <section className="card">
      <h2 className="section-title">Planned today</h2>
      <ul className="planned-list">
        {pending.map((entry) => (
          <li key={entry.habit.id} className="planned-row">
            <span className="planned-label">
              {entry.label}
              <span className="text-muted">
                {' '}
                {formatClockTime(entry.scheduledAt)}
                {entry.scheduledAt <= nowMs ? ' · overdue' : ''}
              </span>
            </span>
            <button type="button" className="button" onClick={() => onLog(entry)}>
              Log
            </button>
            <button type="button" className="text-button" onClick={() => onSkip(entry)}>
              Skip
            </button>
          </li>
        ))}
      </ul>
      <label className="field field-checkbox">
        <input
          type="checkbox"
          checked={countInForecast}
          onChange={(event) => onToggleCountInForecast(event.target.checked)}
        />
        <span>Count upcoming habits in the forecast</span>
      </label>
    </section>
  );
}
