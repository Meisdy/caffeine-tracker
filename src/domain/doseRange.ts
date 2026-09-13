import { DOSE_UNCERTAINTY } from './constants';

export interface DoseRangeMg {
  lowMg: number;
  highMg: number;
}

/**
 * The plausible spread around a catalog dose.
 *
 * Two espressos from different machines can differ by more than the whole
 * model's error budget, so the range is shown while setting up a favorite to
 * prompt a one-off calibration rather than implying the catalog value is exact.
 */
export function typicalDoseRangeMg(caffeineMg: number): DoseRangeMg {
  return {
    lowMg: Math.round(caffeineMg * (1 - DOSE_UNCERTAINTY)),
    highMg: Math.round(caffeineMg * (1 + DOSE_UNCERTAINTY)),
  };
}
