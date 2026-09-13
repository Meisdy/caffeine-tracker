/**
 * Entity types not already covered by `domain/types.ts`.
 *
 * These describe how the app stores and organizes data (drinks catalog,
 * favorites, sources, settings) rather than the caffeine-tracking domain
 * model itself.
 */

import type { AlertnessSample, BedtimeByWeekday, Profile } from '../domain/types';

export type DrinkCategory = 'coffee' | 'tea' | 'energy' | 'soda' | 'chocolate' | 'supplement';

export interface Drink {
  id: string;
  name: string;
  category: DrinkCategory;
  defaultVolumeMl: number | null;
  /** Exactly one of `mgPer100Ml` / `fixedMg` is non-null. */
  mgPer100Ml: number | null;
  fixedMg: number | null;
  isSeeded: boolean;
}

export interface Source {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Favorite {
  id: string;
  drinkId: string;
  sourceId: string | null;
  /** e.g. "Espresso — work Jura" */
  label: string;
  volumeMl: number | null;
  /** Resolved dose: one tap logs exactly this amount. */
  caffeineMg: number;
  sortOrder: number;
}

export interface AlertnessRating extends AlertnessSample {
  id: string;
}

export interface Settings {
  id: 'settings';
  notifyCutoff: boolean;
  notifyUnusualIntake: boolean;
  notifyToleranceAdvice: boolean;
}

/** Dexie needs a keyed row even for singletons. */
export type StoredProfile = Profile & { id: 'profile' };

const EVERY_WEEKDAY_AT_ELEVEN_PM: BedtimeByWeekday = {
  0: 1380,
  1: 1380,
  2: 1380,
  3: 1380,
  4: 1380,
  5: 1380,
  6: 1380,
};

export const DEFAULT_PROFILE: Profile = {
  weightKg: 75,
  age: 30,
  sex: 'other',
  modifiers: {
    smokes: false,
    usesOralContraceptives: false,
    pregnancy: 'none',
    liverImpairment: 'none',
  },
  bedtimeByWeekday: EVERY_WEEKDAY_AT_ELEVEN_PM,
  sleepDisruptionThresholdMgPerL: 1.0,
  halfLifeOverrideHours: null,
};

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  notifyCutoff: true,
  notifyUnusualIntake: true,
  notifyToleranceAdvice: true,
};
