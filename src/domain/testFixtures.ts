import type { BedtimeByWeekday, Intake, Profile } from './types';

/** 23:00 every night. */
const BEDTIME_AT_ELEVEN: BedtimeByWeekday = { 0: 1380, 1: 1380, 2: 1380, 3: 1380, 4: 1380, 5: 1380, 6: 1380 };

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    weightKg: 70,
    age: 30,
    sex: 'other',
    modifiers: {
      smokes: false,
      usesOralContraceptives: false,
      pregnancy: 'none',
      liverImpairment: 'none',
    },
    bedtimeByWeekday: BEDTIME_AT_ELEVEN,
    sleepDisruptionThresholdMgPerL: 1,
    halfLifeOverrideHours: null,
    ...overrides,
  };
}

export function makeIntake(takenAt: number, caffeineMg: number): Intake {
  return {
    id: `intake-${takenAt}-${caffeineMg}`,
    takenAt,
    caffeineMg,
    label: 'Test drink',
    volumeMl: null,
    favoriteId: null,
    drinkId: null,
    sourceId: null,
    updatedAt: takenAt,
  };
}
