/**
 * The only module allowed to touch `database` directly. Everything else in
 * the app reads and writes caffeine data through these functions so storage
 * details (Dexie, table shapes, singleton keys) stay in one place.
 */

import type { Intake, Profile } from '../domain/types';
import type { AlertnessRating, Drink, Favorite, Settings, Source } from './entities';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from './entities';
import { database } from './database';

export async function logIntake(input: {
  caffeineMg: number;
  label: string;
  takenAt: number;
  volumeMl?: number | null;
  favoriteId?: string | null;
  drinkId?: string | null;
  sourceId?: string | null;
}): Promise<Intake> {
  const intake: Intake = {
    id: crypto.randomUUID(),
    takenAt: input.takenAt,
    caffeineMg: input.caffeineMg,
    label: input.label,
    volumeMl: input.volumeMl ?? null,
    favoriteId: input.favoriteId ?? null,
    drinkId: input.drinkId ?? null,
    sourceId: input.sourceId ?? null,
    updatedAt: Date.now(),
  };

  await database.intakes.add(intake);
  return intake;
}

export async function updateIntake(
  id: string,
  changes: Partial<Omit<Intake, 'id'>>,
): Promise<void> {
  const updatedRowCount = await database.intakes.update(id, {
    ...changes,
    updatedAt: Date.now(),
  });

  if (updatedRowCount === 0) {
    throw new Error(`Cannot update intake "${id}": no such intake exists.`);
  }
}

export async function deleteIntake(id: string): Promise<void> {
  await database.intakes.delete(id);
}

export async function getIntakesBetween(fromMs: number, toMs: number): Promise<Intake[]> {
  return database.intakes.where('takenAt').between(fromMs, toMs, true, true).sortBy('takenAt');
}

export async function getRecentIntakes(sinceMs: number): Promise<Intake[]> {
  return database.intakes.where('takenAt').aboveOrEqual(sinceMs).sortBy('takenAt');
}

export async function listFavorites(): Promise<Favorite[]> {
  return database.favorites.orderBy('sortOrder').toArray();
}

export async function saveFavorite(
  favorite: Omit<Favorite, 'id'> & { id?: string },
): Promise<Favorite> {
  const resolvedFavorite: Favorite = { ...favorite, id: favorite.id ?? crypto.randomUUID() };
  await database.favorites.put(resolvedFavorite);
  return resolvedFavorite;
}

export async function deleteFavorite(id: string): Promise<void> {
  await database.favorites.delete(id);
}

export async function listDrinks(): Promise<Drink[]> {
  return database.drinks.toArray();
}

export async function saveCustomDrink(
  drink: Omit<Drink, 'id' | 'isSeeded'> & { id?: string },
): Promise<Drink> {
  // A user-saved drink is never marked seeded, even when editing one that
  // started life as a seed (that becomes a user override going forward).
  const resolvedDrink: Drink = { ...drink, id: drink.id ?? crypto.randomUUID(), isSeeded: false };
  await database.drinks.put(resolvedDrink);
  return resolvedDrink;
}

export async function listSources(): Promise<Source[]> {
  return database.sources.orderBy('sortOrder').toArray();
}

export async function getProfile(): Promise<Profile> {
  const storedProfile = await database.profile.get('profile');
  if (!storedProfile) return DEFAULT_PROFILE;

  const { id, ...profile } = storedProfile;
  return profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await database.profile.put({ ...profile, id: 'profile' });
}

export async function getSettings(): Promise<Settings> {
  const settings = await database.settings.get('settings');
  return settings ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await database.settings.put(settings);
}

export async function recordAlertness(rating: 1 | 2 | 3 | 4 | 5): Promise<void> {
  const alertnessRating: AlertnessRating = {
    id: crypto.randomUUID(),
    ratedAt: Date.now(),
    rating,
  };

  await database.alertnessRatings.add(alertnessRating);
}

export async function getAlertnessBetween(
  fromMs: number,
  toMs: number,
): Promise<AlertnessRating[]> {
  return database.alertnessRatings
    .where('ratedAt')
    .between(fromMs, toMs, true, true)
    .sortBy('ratedAt');
}
