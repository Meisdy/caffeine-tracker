import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useIntakes } from '../hooks/useIntakes';
import { useProfile } from '../hooks/useProfile';
import { CARRY_OVER_HOURS, dayWindow, profileOnDay, summarizeDay } from '../../domain/dayHistory';
import type { DaySummary } from '../../domain/dayHistory';
import { concentrationAt, curveOverWindow } from '../../domain/pharmacokinetics';
import { HOUR_MS, startOfLocalDay } from '../../domain/time';
import { listProfileHistory } from '../../data/repositories';
import { CurveChart } from './CurveChart';
import { formatClockTime, formatShortDate } from '../lib/date';

const CURVE_STEP_MINUTES = 15;

interface DayCurveCardProps {
  dayStartMs: number;
  nowMs: number;
  /** Omitted when there is no earlier or later day to show. */
  onPrevious?: () => void;
  onNext?: () => void;
}

/** One day's curve, drawn with the profile that applied on that day. */
export function DayCurveCard({ dayStartMs, nowMs, onPrevious, onNext }: DayCurveCardProps) {
  const { profile: currentProfile } = useProfile();
  const profileHistory = useLiveQuery(() => listProfileHistory(), []);
  const profile = profileHistory ? (profileOnDay(profileHistory, dayStartMs) ?? currentProfile) : null;
  const bounds = profile ? dayWindow(profile, dayStartMs) : null;

  const intakes = useIntakes(dayStartMs - CARRY_OVER_HOURS * HOUR_MS, bounds?.toMs ?? dayStartMs);

  const curve = useMemo(
    () => (profile && bounds ? curveOverWindow(intakes, bounds.fromMs, bounds.toMs, CURVE_STEP_MINUTES, profile) : []),
    [profile, bounds?.fromMs, bounds?.toMs, intakes],
  );

  const dayLabel = dayStartMs === startOfLocalDay(nowMs) ? 'Today' : formatShortDate(dayStartMs);

  return (
    <section className="card">
      <div className="section-header">
        <h2 className="section-title">Caffeine curve · {dayLabel}</h2>
        <div className="day-curve-navigation">
          <button type="button" className="icon-button" aria-label="Previous day" disabled={!onPrevious} onClick={onPrevious}>
            ‹
          </button>
          <button type="button" className="icon-button" aria-label="Next day" disabled={!onNext} onClick={onNext}>
            ›
          </button>
        </div>
      </div>
      {profile && bounds ? (
        <>
          <DaySummaryLine summary={summarizeDay(intakes, profile, bounds)} bedtimeAt={bounds.bedtimeAt} />
          <CurveChart
            curve={curve}
            intakes={intakes}
            fromMs={bounds.fromMs}
            toMs={bounds.toMs}
            nowMs={nowMs}
            bedtimeAtMs={bounds.bedtimeAt}
            sleepThresholdMgPerL={profile.sleepDisruptionThresholdMgPerL}
            currentConcentrationMgPerL={concentrationAt(intakes, nowMs, profile)}
          />
        </>
      ) : (
        <p className="text-muted">Loading…</p>
      )}
    </section>
  );
}

function DaySummaryLine({ summary, bedtimeAt }: { summary: DaySummary; bedtimeAt: number }) {
  return (
    <p className="text-muted day-curve-summary">
      {summary.totalMg.toFixed(0)} mg · peak ~{summary.peak.concentrationMgPerL.toFixed(1)} mg/L at{' '}
      {formatClockTime(summary.peak.at)} · bed {formatClockTime(bedtimeAt)} ~{summary.sleepLevelMgPerL.toFixed(1)} mg/L{' '}
      <strong>{summary.isOverSleepThreshold ? 'over threshold' : 'under threshold'}</strong>
    </p>
  );
}
