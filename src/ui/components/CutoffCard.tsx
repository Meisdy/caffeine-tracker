import type { CutoffWindow } from '../../domain/sleep';
import { formatClockTime } from '../lib/date';

interface CutoffCardProps {
  cutoff: CutoffWindow;
  bedtimeAt: number;
  projectedBedtimeLevelMgPerL: number;
  sleepThresholdMgPerL: number;
  /** The reference dose the cutoff answers "can I still have one more of these?" for. */
  referenceDoseMg: number;
}

export function CutoffCard({
  cutoff,
  bedtimeAt,
  projectedBedtimeLevelMgPerL,
  sleepThresholdMgPerL,
  referenceDoseMg,
}: CutoffCardProps) {
  return (
    <section className="card">
      <h2 className="section-title">Sleep cutoff</h2>
      <p className="cutoff-projection">
        Projected level at bedtime ({formatClockTime(bedtimeAt)}): around{' '}
        <strong>{projectedBedtimeLevelMgPerL.toFixed(1)} mg/L</strong>{' '}
        <span className="text-muted">(threshold {sleepThresholdMgPerL.toFixed(1)} mg/L)</span>
      </p>
      {cutoff.estimate === null ? (
        <p className="cutoff-warning">
          Too late for another one — even a {referenceDoseMg.toFixed(0)} mg coffee now would put you
          over the threshold by bedtime.
        </p>
      ) : (
        <>
          <p className="cutoff-safe">
            You can still have a {referenceDoseMg.toFixed(0)} mg coffee until{' '}
            <strong>{formatCutoffWindow(cutoff)}</strong> and stay under your sleep threshold at
            bedtime.
          </p>
          <p className="text-muted cutoff-caveat">
            A range, not a deadline — your true half-life is the biggest unknown here.
          </p>
        </>
      )}
    </section>
  );
}

/**
 * Collapses to a single time when the uncertainty does not move the answer,
 * which happens whenever the window is clipped by bedtime itself.
 */
function formatCutoffWindow({ earliest, estimate, latest }: CutoffWindow): string {
  if (estimate === null) return '';
  if (earliest === null) return formatClockTime(estimate);

  const upperBound = latest ?? estimate;
  if (formatClockTime(earliest) === formatClockTime(upperBound)) {
    return formatClockTime(estimate);
  }
  return `${formatClockTime(earliest)}–${formatClockTime(upperBound)}`;
}
