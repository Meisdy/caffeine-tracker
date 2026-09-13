import { useMemo } from 'react';
import { useIntakes } from '../hooks/useIntakes';
import { useNow } from '../hooks/useNow';
import { rollingDailyStats } from '../../domain/baseline';
import { DAY_MS } from '../../domain/time';
import type { Weekday } from '../../domain/types';
import { updateIntake, deleteIntake } from '../../data/repositories';
import { IntakeList } from '../components/IntakeList';
import { formatDayKeyShort, formatWeekdayLabel } from '../lib/date';

const HISTORY_WINDOW_DAYS = 30;
const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function HistoryScreen() {
  const now = useNow();
  const historyStartMs = now - HISTORY_WINDOW_DAYS * DAY_MS;
  const intakes = useIntakes(historyStartMs, now);

  const baseline = useMemo(() => rollingDailyStats(intakes, now, HISTORY_WINDOW_DAYS), [intakes, now]);

  const maxDailyTotalMg = Math.max(...baseline.dailyTotals.map((day) => day.totalMg), 1);
  const maxWeekdayMeanMg = Math.max(...WEEKDAYS.map((weekday) => baseline.meanByWeekday[weekday] ?? 0), 1);

  const pastIntakes = useMemo(() => [...intakes].sort((a, b) => b.takenAt - a.takenAt), [intakes]);

  return (
    <div className="screen history-screen">
      <section className="card">
        <h2 className="section-title">Last {HISTORY_WINDOW_DAYS} days</h2>
        {baseline.dailyTotals.length === 0 ? (
          <p className="text-muted">No history yet.</p>
        ) : (
          <div className="history-bar-chart">
            {baseline.dailyTotals.map((day) => (
              <div
                key={day.day}
                className="history-bar-column"
                title={`${formatDayKeyShort(day.day)}: ${day.totalMg.toFixed(0)} mg`}
              >
                <div className="history-bar" style={{ height: `${(day.totalMg / maxDailyTotalMg) * 100}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">By day of week</h2>
        <div className="weekday-breakdown">
          {WEEKDAYS.map((weekday) => {
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
