import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Intake } from '../domain/types';
import type {
  AlertnessRating,
  Drink,
  Favorite,
  Settings,
  Source,
  StoredProfile,
} from './entities';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from './entities';
import { SEED_DRINKS, SEED_SOURCES } from './seedDrinks';

export class CaffeineDatabase extends Dexie {
  drinks!: Table<Drink, string>;
  sources!: Table<Source, string>;
  favorites!: Table<Favorite, string>;
  intakes!: Table<Intake, string>;
  alertnessRatings!: Table<AlertnessRating, string>;
  profile!: Table<StoredProfile, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('caffeine-tracker');

    this.version(1).stores({
      drinks: 'id, category',
      sources: 'id, sortOrder',
      favorites: 'id, sortOrder',
      intakes: 'id, takenAt',
      alertnessRatings: 'id, ratedAt',
      profile: 'id',
      settings: 'id',
    });
  }
}

export const database = new CaffeineDatabase();

/**
 * Seeds the drink catalog and default singleton rows on first run.
 * Safe to call on every app start: existing data is never overwritten.
 */
export async function initializeDatabase(): Promise<void> {
  await seedDrinksIfEmpty();
  await seedSourcesIfEmpty();
  await seedProfileIfMissing();
  await seedSettingsIfMissing();
}

async function seedDrinksIfEmpty(): Promise<void> {
  const drinkCount = await database.drinks.count();
  if (drinkCount > 0) return;

  await database.drinks.bulkAdd(SEED_DRINKS);
}

async function seedSourcesIfEmpty(): Promise<void> {
  const sourceCount = await database.sources.count();
  if (sourceCount > 0) return;

  await database.sources.bulkAdd(SEED_SOURCES);
}

async function seedProfileIfMissing(): Promise<void> {
  const existingProfile = await database.profile.get('profile');
  if (existingProfile) return;

  await database.profile.add({ ...DEFAULT_PROFILE, id: 'profile' });
}

async function seedSettingsIfMissing(): Promise<void> {
  const existingSettings = await database.settings.get('settings');
  if (existingSettings) return;

  await database.settings.add(DEFAULT_SETTINGS);
}
