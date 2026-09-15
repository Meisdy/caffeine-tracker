import type { CutoffWindow } from '../../domain/sleep';
import type { Recommendation } from '../../domain/types';
import { formatClockTime } from '../lib/date';

interface AdviceCardProps {
  recommendations: Recommendation[];
  cutoff: CutoffWindow;
  bedtimeAt: number;
  projectedBedtimeLevelMgPerL: number;
  /** The reference dose the cutoff answers "can I still have one more of these?" for. */
  referenceDoseMg: number;
}

export function AdviceCard({
  recommendations,
  cutoff,
  bedtimeAt,
  projectedBedtimeLevelMgPerL,
  referenceDoseMg,
}: AdviceCardProps) {
  return (
    <section className="card">
      <h2 className="section-title">Advice</h2>
      {recommendations.length > 0 && (
        <ul className="recommendation-list">
          {recommendations.map((recommendation) => (
            <li key={recommendation.id} className={`recommendation recommendation-${recommendation.severity}`}>
              {recommendation.message}
            </li>
          ))}
        </ul>
      )}
      <div className="cutoff-summary">
        {cutoff.estimate === null ? (
          <p className="cutoff-warning">Too late for another coffee today.</p>
        ) : (
          <p className="cutoff-safe">
            One more {referenceDoseMg.toFixed(0)} mg coffee is fine until{' '}
            <strong>{formatCutoffWindow(cutoff)}</strong>.
          </p>
        )}
        <p className="text-muted cutoff-projection">
          Bedtime {formatClockTime(bedtimeAt)} · ~{projectedBedtimeLevelMgPerL.toFixed(1)} mg/L projected
        </p>
      </div>
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
