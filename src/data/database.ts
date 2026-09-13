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
 * Seeds the catalog and default singleton rows.
 * Safe to call on every app start: user data is never overwritten.
 */
export async function initializeDatabase(): Promise<void> {
  await synchronizeSeedDrinks();
  await seedSourcesIfEmpty();
  await seedProfileIfMissing();
  await seedSettingsIfMissing();
}

/**
 * Brings the seeded part of the catalog in line with the shipped list on every
 * start, rather than only on first run.
 *
 * Installs are long-lived and updates arrive silently, so a catalog correction
 * would otherwise never reach anyone who already opened the app. Only rows
 * marked `isSeeded` are touched: drinks the user created or edited are theirs,
 * and past intakes are unaffected either way because each one stores its own
 * dose and label.
 */
async function synchronizeSeedDrinks(): Promise<void> {
  const existingDrinks = await database.drinks.toArray();
  const shippedIds = new Set(SEED_DRINKS.map((drink) => drink.id));
  const userEditedIds = new Set(
    existingDrinks.filter((drink) => !drink.isSeeded).map((drink) => drink.id),
  );

  // A drink the user has taken ownership of keeps their version.
  await database.drinks.bulkPut(SEED_DRINKS.filter((drink) => !userEditedIds.has(drink.id)));

  const favorites = await database.favorites.toArray();
  const referencedDrinkIds = new Set(favorites.map((favorite) => favorite.drinkId));
  const withdrawnIds = existingDrinks
    .filter((drink) => drink.isSeeded && !shippedIds.has(drink.id))
    // Removing one still pinned by a favorite would leave that favorite dangling.
    .filter((drink) => !referencedDrinkIds.has(drink.id))
    .map((drink) => drink.id);

  await database.drinks.bulkDelete(withdrawnIds);
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
