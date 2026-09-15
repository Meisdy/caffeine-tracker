import { useMemo } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useIntakes } from '../hooks/useIntakes';
import { useAlertnessRatings } from '../hooks/useAlertnessRatings';
import { useNow } from '../hooks/useNow';
import { rollingDailyStats, classifyTodayIntake, totalMgOnDay } from '../../domain/baseline';
import { toleranceState, withdrawalRisk as calculateWithdrawalRisk } from '../../domain/tolerance';
import { personalHalfLifeHours, halfLifeFactorsFor } from '../../domain/halfLife';
import { alertnessFit } from '../../domain/alertnessFit';
import { recentNightsOverThreshold } from '../../domain/sleep';
import { RECENT_NIGHTS_COUNT } from '../../domain/constants';
import { DAY_MS, weekdayOf } from '../../domain/time';
import type { IntakeDeviation, WithdrawalRisk } from '../../domain/types';
import { AlertnessFitCard } from '../components/AlertnessFitCard';

const HISTORY_WINDOW_DAYS = 30;
const HISTORY_BUFFER_DAYS = 5;
const RECENT_WINDOW_DAYS = 7;

const DEVIATION_DESCRIPTIONS: Record<IntakeDeviation, string> = {
  unusuallyLow: 'Today is unusually low compared to your recent habits.',
  typical: 'Today is in line with your recent habits.',
  unusuallyHigh: 'Today is unusually high compared to your recent habits.',
  insufficientHistory: 'Not enough history yet to judge whether today is unusual.',
};

const WITHDRAWAL_DESCRIPTIONS: Record<WithdrawalRisk, string> = {
  none: 'No signs of withdrawal risk today.',
  possible: "Today's intake is low enough relative to your recent habits that withdrawal symptoms are possible.",
  likely: "Today's intake is far enough below your recent habits that withdrawal symptoms are likely.",
};

function describeToleranceIndex(index: number): string {
  if (index < 0.33) {
    return 'Your recent intake has been light — your natural sensitivity to caffeine is likely mostly intact.';
  }
  if (index < 0.66) {
    return 'Your recent intake has built up a moderate tolerance — you may need somewhat more than a light user to feel the same effect.';
  }
  return 'Your recent intake has been consistently high — a meaningful tolerance has likely built up.';
}

export function InsightsScreen() {
  const { profile, isLoading } = useProfile();
  const [now] = useNow();
  const historyStartMs = now - (HISTORY_WINDOW_DAYS + HISTORY_BUFFER_DAYS) * DAY_MS;
  const intakes = useIntakes(historyStartMs, now);
  const ratings = useAlertnessRatings(historyStartMs, now);

  const baseline30 = useMemo(() => rollingDailyStats(intakes, now, HISTORY_WINDOW_DAYS), [intakes, now]);
  const baseline7 = useMemo(() => rollingDailyStats(intakes, now, RECENT_WINDOW_DAYS), [intakes, now]);
  const tolerance = useMemo(() => toleranceState(intakes, now), [intakes, now]);
  const fit = useMemo(
    () => (profile ? alertnessFit(ratings, intakes, profile, tolerance) : null),
    [ratings, intakes, profile, tolerance],
  );

  const nights = useMemo(() => {
    if (!profile) return null;
    const firstIntakeAt = Math.min(...intakes.map((intake) => intake.takenAt));
    return recentNightsOverThreshold(intakes, profile, now, RECENT_NIGHTS_COUNT, firstIntakeAt);
  }, [intakes, profile, now]);

  const todayTotalMg = totalMgOnDay(intakes, now);
  const deviation = classifyTodayIntake(todayTotalMg, baseline30, weekdayOf(now));
  const withdrawal = calculateWithdrawalRisk(todayTotalMg, tolerance);

  if (isLoading || !profile || !fit || !nights) {
    return <p className="text-muted">Loading…</p>;
  }

  const halfLifeHours = personalHalfLifeHours(profile);
  const halfLifeFactors = halfLifeFactorsFor(profile);

  return (
    <div className="screen insights-screen">
      <AlertnessFitCard fit={fit} windowDays={HISTORY_WINDOW_DAYS} />

      <section className="card">
        <h2 className="section-title">Sleep nights (estimate)</h2>
        {nights.nightsJudged === 0 ? (
          <p className="text-muted">No nights to judge yet — this fills in once you have logged caffeine before a bedtime.</p>
        ) : (
          <>
            <p className="insights-big-number">
              {nights.overThreshold} of {nights.nightsJudged}
            </p>
            <p>
              Recent nights where caffeine was still above your {profile.sleepDisruptionThresholdMgPerL.toFixed(1)}{' '}
              mg/L sleep threshold at bedtime.
            </p>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Tolerance index (estimate)</h2>
        <p className="insights-big-number">{(tolerance.index * 100).toFixed(0)}%</p>
        <p>{describeToleranceIndex(tolerance.index)}</p>
      </section>

      <section className="card">
        <h2 className="section-title">Rolling averages</h2>
        <p>
          {RECENT_WINDOW_DAYS}-day average: <strong>{baseline7.meanMgPerDay.toFixed(0)} mg/day</strong>
        </p>
        <p>
          {HISTORY_WINDOW_DAYS}-day average: <strong>{baseline30.meanMgPerDay.toFixed(0)} mg/day</strong>
        </p>
        <p className="text-muted">Based on {baseline30.daysOfHistory} day(s) of history.</p>
      </section>

      <section className="card">
        <h2 className="section-title">Today vs. usual</h2>
        <p>{DEVIATION_DESCRIPTIONS[deviation]}</p>
      </section>

      <section className="card">
        <h2 className="section-title">Withdrawal risk (estimate)</h2>
        <p>{WITHDRAWAL_DESCRIPTIONS[withdrawal]}</p>
      </section>

      <section className="card">
        <h2 className="section-title">Personal half-life (estimate)</h2>
        <p className="insights-big-number">{halfLifeHours.toFixed(1)} h</p>
        {halfLifeFactors.length === 0 ? (
          <p className="text-muted">No modifiers apply — this is the baseline population estimate.</p>
        ) : (
          <ul className="modifier-list">
            {halfLifeFactors.map((factor) => (
              <li key={factor.label}>
                {factor.label}: ×{factor.factor.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
