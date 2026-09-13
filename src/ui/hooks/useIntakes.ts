import { useLiveQuery } from 'dexie-react-hooks';
import type { Intake } from '../../domain/types';
import { getIntakesBetween } from '../../data/repositories';

const NO_INTAKES: Intake[] = [];

/** Live view of intakes taken in [fromMs, toMs]; re-renders the instant anything is logged, edited, or deleted. */
export function useIntakes(fromMs: number, toMs: number): Intake[] {
  return useLiveQuery(() => getIntakesBetween(fromMs, toMs), [fromMs, toMs]) ?? NO_INTAKES;
}
