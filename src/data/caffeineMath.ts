import type { Drink } from './entities';

const ONE_DECIMAL_PLACE = 10;

/**
 * Resolves the caffeine dose for a drink at a given volume.
 *
 * Shared by the favorite editor and the custom drink builder so both stay
 * consistent about how fixed-dose vs. concentration-based drinks resolve.
 */
export function resolveCaffeineMg(drink: Drink, volumeMl: number | null): number {
  if (drink.fixedMg !== null) {
    return roundToOneDecimalPlace(drink.fixedMg);
  }

  if (drink.mgPer100Ml !== null && volumeMl !== null) {
    return roundToOneDecimalPlace((drink.mgPer100Ml * volumeMl) / 100);
  }

  throw new Error(
    `Cannot resolve caffeine dose for drink "${drink.name}": it has no fixed dose, or no volume was given for its per-100ml concentration.`,
  );
}

function roundToOneDecimalPlace(value: number): number {
  return Math.round(value * ONE_DECIMAL_PLACE) / ONE_DECIMAL_PLACE;
}
