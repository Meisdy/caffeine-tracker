/**
 * Checks the model against the one thing it cannot compute: how the drinker
 * actually felt.
 *
 * Each alertness rating is paired with the concentration the model believed
 * was on board at that minute. If the model describes this person, ratings
 * should climb with the curve. When they do not, the half-life estimate or
 * the catalog doses are wrong — which is worth knowing, and is the only
 * honest thing a self-report can tell us without pretending to measure blood.
 *
 * Nothing here feeds back into the model. It reports agreement; it does not
 * silently retune anything.
 */

import {
  ALERTNESS_CORRELATION_THRESHOLD,
  ALERTNESS_HIGH_BAND_MULTIPLE,
  MINIMUM_RATINGS_FOR_ALERTNESS_FIT,
} from './constants';
import { concentrationAt } from './pharmacokinetics';
import { effectThresholdFor } from './phases';
import type { AlertnessSample, Dose, Profile, ToleranceState } from './types';

export type AlertnessAgreement = 'tracksModel' | 'noRelationship' | 'contradictsModel' | 'unknown';

export interface AlertnessBand {
  /** Identifies the band for rendering; the screen supplies the wording. */
  id: 'low' | 'working' | 'high';
  lowerBoundMgPerL: number;
  upperBoundMgPerL: number | null;
  ratingCount: number;
  /** Null when nothing has been rated inside this band yet. */
  meanRating: number | null;
}

export interface AlertnessFit {
  ratingCount: number;
  bands: AlertnessBand[];
  /**
   * Pearson correlation between modeled concentration and reported alertness.
   * Null until there are enough ratings to mean anything.
   */
  correlation: number | null;
  agreement: AlertnessAgreement;
}

interface PairedRating {
  concentrationMgPerL: number;
  rating: number;
}

/**
 * @param samples ratings to judge; the caller decides how far back to look
 * @param doses every dose that could still have been on board at those times
 */
export function alertnessFit(
  samples: readonly AlertnessSample[],
  doses: readonly Dose[],
  profile: Profile,
  tolerance: ToleranceState,
): AlertnessFit {
  const effectThreshold = effectThresholdFor(tolerance);
  const highThreshold = effectThreshold * ALERTNESS_HIGH_BAND_MULTIPLE;

  const paired: PairedRating[] = samples.map((sample) => ({
    concentrationMgPerL: concentrationAt(doses, sample.ratedAt, profile),
    rating: sample.rating,
  }));

  const bands: AlertnessBand[] = [
    summarizeBand('low', paired, 0, effectThreshold),
    summarizeBand('working', paired, effectThreshold, highThreshold),
    summarizeBand('high', paired, highThreshold, null),
  ];

  const hasEnoughRatings = paired.length >= MINIMUM_RATINGS_FOR_ALERTNESS_FIT;
  const correlation = hasEnoughRatings ? pearsonCorrelation(paired) : null;

  return {
    ratingCount: paired.length,
    bands,
    correlation,
    agreement: classifyAgreement(correlation),
  };
}

function summarizeBand(
  id: AlertnessBand['id'],
  paired: readonly PairedRating[],
  lowerBoundMgPerL: number,
  upperBoundMgPerL: number | null,
): AlertnessBand {
  const inBand = paired.filter(
    (pair) =>
      pair.concentrationMgPerL >= lowerBoundMgPerL &&
      (upperBoundMgPerL === null || pair.concentrationMgPerL < upperBoundMgPerL),
  );

  if (inBand.length === 0) {
    return { id, lowerBoundMgPerL, upperBoundMgPerL, ratingCount: 0, meanRating: null };
  }

  const total = inBand.reduce((sum, pair) => sum + pair.rating, 0);
  return {
    id,
    lowerBoundMgPerL,
    upperBoundMgPerL,
    ratingCount: inBand.length,
    meanRating: total / inBand.length,
  };
}

function pearsonCorrelation(paired: readonly PairedRating[]): number | null {
  const meanConcentration = mean(paired.map((pair) => pair.concentrationMgPerL));
  const meanRating = mean(paired.map((pair) => pair.rating));

  let covariance = 0;
  let concentrationVariance = 0;
  let ratingVariance = 0;

  for (const pair of paired) {
    const concentrationDelta = pair.concentrationMgPerL - meanConcentration;
    const ratingDelta = pair.rating - meanRating;
    covariance += concentrationDelta * ratingDelta;
    concentrationVariance += concentrationDelta * concentrationDelta;
    ratingVariance += ratingDelta * ratingDelta;
  }

  // Rating every moment the same, or rating only at one concentration, leaves
  // nothing to correlate rather than a correlation of zero.
  const spread = Math.sqrt(concentrationVariance * ratingVariance);
  if (spread === 0) return null;

  return covariance / spread;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function classifyAgreement(correlation: number | null): AlertnessAgreement {
  if (correlation === null) return 'unknown';
  if (correlation >= ALERTNESS_CORRELATION_THRESHOLD) return 'tracksModel';
  if (correlation <= -ALERTNESS_CORRELATION_THRESHOLD) return 'contradictsModel';
  return 'noRelationship';
}
