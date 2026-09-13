import {
  BASELINE_HALF_LIFE_HOURS,
  LIVER_IMPAIRMENT_HALF_LIFE_FACTORS,
  MAX_HALF_LIFE_HOURS,
  MIN_HALF_LIFE_HOURS,
  OLDER_ADULT_AGE_YEARS,
  OLDER_ADULT_HALF_LIFE_FACTOR,
  ORAL_CONTRACEPTIVE_HALF_LIFE_FACTOR,
  PREGNANCY_HALF_LIFE_FACTORS,
  SMOKING_HALF_LIFE_FACTOR,
  VOLUME_OF_DISTRIBUTION_LITRES_PER_KG,
} from './constants';
import type { Profile } from './types';

export interface HalfLifeFactor {
  label: string;
  factor: number;
}

/**
 * The individual factors behind the personal half-life, so the Profile screen
 * can show its work instead of presenting a bare number.
 */
export function halfLifeFactorsFor(profile: Profile): HalfLifeFactor[] {
  const { modifiers } = profile;
  const factors: HalfLifeFactor[] = [];

  if (modifiers.smokes) {
    factors.push({ label: 'Smoking', factor: SMOKING_HALF_LIFE_FACTOR });
  }
  if (modifiers.usesOralContraceptives) {
    factors.push({ label: 'Oral contraceptives', factor: ORAL_CONTRACEPTIVE_HALF_LIFE_FACTOR });
  }
  if (modifiers.pregnancy !== 'none') {
    factors.push({
      label: `Pregnancy (${modifiers.pregnancy} trimester)`,
      factor: PREGNANCY_HALF_LIFE_FACTORS[modifiers.pregnancy],
    });
  }
  if (modifiers.liverImpairment !== 'none') {
    factors.push({
      label: `Liver impairment (${modifiers.liverImpairment})`,
      factor: LIVER_IMPAIRMENT_HALF_LIFE_FACTORS[modifiers.liverImpairment],
    });
  }
  if (profile.age >= OLDER_ADULT_AGE_YEARS) {
    factors.push({ label: `Age ${OLDER_ADULT_AGE_YEARS}+`, factor: OLDER_ADULT_HALF_LIFE_FACTOR });
  }

  return factors;
}

export function personalHalfLifeHours(profile: Profile): number {
  if (profile.halfLifeOverrideHours !== null) {
    return clampHalfLife(profile.halfLifeOverrideHours);
  }

  const combined = halfLifeFactorsFor(profile).reduce(
    (hours, { factor }) => hours * factor,
    BASELINE_HALF_LIFE_HOURS,
  );
  return clampHalfLife(combined);
}

export function eliminationRatePerHour(profile: Profile): number {
  return Math.LN2 / personalHalfLifeHours(profile);
}

export function volumeOfDistributionLitres(profile: Profile): number {
  return VOLUME_OF_DISTRIBUTION_LITRES_PER_KG * profile.weightKg;
}

function clampHalfLife(hours: number): number {
  return Math.min(MAX_HALF_LIFE_HOURS, Math.max(MIN_HALF_LIFE_HOURS, hours));
}
