import { formatClockTime } from '../lib/date';

interface CutoffCardProps {
  cutoffAt: number | null;
  bedtimeAt: number;
  projectedBedtimeLevelMgPerL: number;
  sleepThresholdMgPerL: number;
  /** The reference dose the cutoff answers "can I still have one more of these?" for. */
  referenceDoseMg: number;
}

export function CutoffCard({
  cutoffAt,
  bedtimeAt,
  projectedBedtimeLevelMgPerL,
  sleepThresholdMgPerL,
  referenceDoseMg,
}: CutoffCardProps) {
  return (
    <section className="card">
      <h2 className="section-title">Sleep cutoff</h2>
      <p className="cutoff-projection">
        Projected level at bedtime ({formatClockTime(bedtimeAt)}):{' '}
        <strong>{projectedBedtimeLevelMgPerL.toFixed(1)} mg/L</strong>{' '}
        <span className="text-muted">(threshold {sleepThresholdMgPerL.toFixed(1)} mg/L)</span>
      </p>
      {cutoffAt === null ? (
        <p className="cutoff-warning">Any further caffeine now is projected to affect your sleep.</p>
      ) : (
        <p className="cutoff-safe">
          You can still have a {referenceDoseMg.toFixed(0)} mg coffee until{' '}
          <strong>{formatClockTime(cutoffAt)}</strong> and stay under your sleep threshold at bedtime.
        </p>
      )}
    </section>
  );
}
