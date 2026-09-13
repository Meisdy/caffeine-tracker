import { useLiveQuery } from 'dexie-react-hooks';
import type { AlertnessRating } from '../../data/entities';
import { getAlertnessBetween } from '../../data/repositories';

const NO_RATINGS: AlertnessRating[] = [];

/** Live view of alertness ratings recorded in [fromMs, toMs]. */
export function useAlertnessRatings(fromMs: number, toMs: number): AlertnessRating[] {
  return useLiveQuery(() => getAlertnessBetween(fromMs, toMs), [fromMs, toMs]) ?? NO_RATINGS;
}
