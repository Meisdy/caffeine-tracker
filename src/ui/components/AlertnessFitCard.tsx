import { MINIMUM_RATINGS_FOR_ALERTNESS_FIT } from '../../domain/constants';
import type { AlertnessAgreement, AlertnessBand, AlertnessFit } from '../../domain/alertnessFit';

const MAXIMUM_RATING = 5;

const BAND_LABELS: Record<AlertnessBand['id'], string> = {
  low: 'Below your effect threshold',
  working: 'In the working range',
  high: 'Well caffeinated',
};

const AGREEMENT_VERDICTS: Record<AlertnessAgreement, string> = {
  tracksModel:
    'Your ratings climb with the modeled level, so the curve is describing you reasonably well.',
  noRelationship:
    'Your ratings do not follow the modeled level. The usual cause is dose: a favorite set to the wrong milligrams throws the whole curve off before the half-life ever matters.',
  contradictsModel:
    'Your ratings run opposite to the modeled level — you report feeling sharpest when the model says you have least on board. Check that intake times are being logged when you actually drink.',
  unknown: 'Your ratings are too alike so far to compare against the curve.',
};

interface AlertnessFitCardProps {
  fit: AlertnessFit;
  windowDays: number;
}

/**
 * The one place the app can be checked rather than believed: self-reported
 * alertness against what the model claimed was on board at that minute.
 */
export function AlertnessFitCard({ fit, windowDays }: AlertnessFitCardProps) {
  const isStillCollecting = fit.ratingCount < MINIMUM_RATINGS_FOR_ALERTNESS_FIT;

  return (
    <section className="card">
      <h2 className="section-title">Model vs. how you felt</h2>

      {isStillCollecting ? (
        <p className="text-muted">
          {fit.ratingCount} of {MINIMUM_RATINGS_FOR_ALERTNESS_FIT} ratings. Tap “How alert do you
          feel?” on Today at different times of day — once there are enough, this compares them
          against the curve.
        </p>
      ) : (
        <>
          <p>{AGREEMENT_VERDICTS[fit.agreement]}</p>
          <ul className="alertness-fit-bands">
            {fit.bands.map((band) => (
              <BandRow key={band.id} band={band} />
            ))}
          </ul>
          <p className="text-muted alertness-fit-footnote">
            {fit.ratingCount} ratings over the last {windowDays} days. Average alertness out of{' '}
            {MAXIMUM_RATING}, grouped by what the model had on board at the time.
          </p>
        </>
      )}
    </section>
  );
}

function BandRow({ band }: { band: AlertnessBand }) {
  const label = BAND_LABELS[band.id];

  if (band.meanRating === null) {
    return (
      <li className="alertness-fit-band">
        <span className="alertness-fit-band-label">{label}</span>
        <span className="text-muted alertness-fit-band-empty">No ratings yet</span>
      </li>
    );
  }

  // Scaled across the full 1-5 range rather than 0-5, so a one-point difference
  // in felt alertness is visible instead of being squashed into a fifth of a bar.
  const filledFraction = (band.meanRating - 1) / (MAXIMUM_RATING - 1);

  return (
    <li className="alertness-fit-band">
      <span className="alertness-fit-band-label">{label}</span>
      <span className="alertness-fit-band-track">
        <span className="alertness-fit-band-fill" style={{ width: `${filledFraction * 100}%` }} />
      </span>
      <span className="alertness-fit-band-value">
        {band.meanRating.toFixed(1)} <span className="text-muted">({band.ratingCount})</span>
      </span>
    </li>
  );
}
