import { useMemo, useState } from 'react';
import { useIntakes } from '../hooks/useIntakes';
import { useNow } from '../hooks/useNow';
import { rollingDailyStats } from '../../domain/baseline';
import { DAY_MS, HOUR_MS, startOfLocalDay } from '../../domain/time';
import { updateIntake, deleteIntake } from '../../data/repositories';
import { IntakeList } from '../components/IntakeList';
import { DayCurveCard } from '../components/DayCurveCard';
import { WEEKDAYS_MONDAY_FIRST, formatDayKeyShort, formatWeekdayLabel } from '../lib/date';

const HISTORY_WINDOW_DAYS = 30;

/** Midnight of a `YYYY-MM-DD` day key, read as local time. */
function dayKeyStart(dayKey: string): number {
  return new Date(`${dayKey}T00:00:00`).getTime();
}

// Stepping from noon keeps the neighbouring day right across daylight-saving changes.
function previousDayStart(dayStartMs: number): number {
  return startOfLocalDay(dayStartMs - 12 * HOUR_MS);
}

function nextDayStart(dayStartMs: number): number {
  return startOfLocalDay(dayStartMs + DAY_MS + 12 * HOUR_MS);
}

export function HistoryScreen() {
  const [now] = useNow();
  const historyStartMs = now - HISTORY_WINDOW_DAYS * DAY_MS;
  const intakes = useIntakes(historyStartMs, now);

  const baseline = useMemo(() => rollingDailyStats(intakes, now, HISTORY_WINDOW_DAYS), [intakes, now]);

  const maxDailyTotalMg = Math.max(...baseline.dailyTotals.map((day) => day.totalMg), 1);
  const maxWeekdayMeanMg = Math.max(...WEEKDAYS_MONDAY_FIRST.map((weekday) => baseline.meanByWeekday[weekday] ?? 0), 1);

  const todayStartMs = startOfLocalDay(now);
  const [selectedDayStartMs, setSelectedDayStartMs] = useState(todayStartMs);
  const firstDay = baseline.dailyTotals[0];
  const oldestDayStartMs = firstDay ? dayKeyStart(firstDay.day) : todayStartMs;

  const pastIntakes = useMemo(() => [...intakes].sort((a, b) => b.takenAt - a.takenAt), [intakes]);

  return (
    <div className="screen history-screen">
      <DayCurveCard
        dayStartMs={selectedDayStartMs}
        nowMs={now}
        onPrevious={
          selectedDayStartMs > oldestDayStartMs
            ? () => setSelectedDayStartMs(previousDayStart(selectedDayStartMs))
            : undefined
        }
        onNext={
          selectedDayStartMs < todayStartMs ? () => setSelectedDayStartMs(nextDayStart(selectedDayStartMs)) : undefined
        }
      />

      <section className="card">
        <h2 className="section-title">Last {HISTORY_WINDOW_DAYS} days</h2>
        {baseline.dailyTotals.length === 0 ? (
          <p className="text-muted">No history yet.</p>
        ) : (
          <div className="history-bar-chart">
            {baseline.dailyTotals.map((day) => (
              <button
                type="button"
                key={day.day}
                className={`history-bar-column ${dayKeyStart(day.day) === selectedDayStartMs ? 'is-active' : ''}`}
                title={`${formatDayKeyShort(day.day)}: ${day.totalMg.toFixed(0)} mg`}
                aria-label={`Show curve for ${formatDayKeyShort(day.day)}, ${day.totalMg.toFixed(0)} mg`}
                aria-pressed={dayKeyStart(day.day) === selectedDayStartMs}
                onClick={() => setSelectedDayStartMs(dayKeyStart(day.day))}
              >
                <div className="history-bar" style={{ height: `${(day.totalMg / maxDailyTotalMg) * 100}%` }} />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">By day of week</h2>
        <div className="weekday-breakdown">
          {WEEKDAYS_MONDAY_FIRST.map((weekday) => {
            const meanMg = baseline.meanByWeekday[weekday];
            return (
              <div key={weekday} className="weekday-row">
                <span className="weekday-row-label">{formatWeekdayLabel(weekday)}</span>
                <div className="weekday-row-bar-track">
                  <div
                    className="weekday-row-bar"
                    style={{ width: meanMg === null ? '0%' : `${(meanMg / maxWeekdayMeanMg) * 100}%` }}
                  />
                </div>
                <span className="weekday-row-value">{meanMg === null ? 'No data' : `${meanMg.toFixed(0)} mg`}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Past intakes</h2>
        <IntakeList
          intakes={pastIntakes}
          emptyMessage="No intakes recorded yet."
          showDate
          onUpdate={(id, changes) => void updateIntake(id, changes)}
          onDelete={(id) => void deleteIntake(id)}
        />
      </section>
    </div>
  );
}
