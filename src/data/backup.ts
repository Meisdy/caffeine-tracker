import type { Intake } from '../domain/types';
import type {
  AlertnessRating,
  Drink,
  Favorite,
  Settings,
  Source,
  StoredProfile,
} from './entities';
import { database } from './database';

const BACKUP_VERSION = 1;

interface DatabaseBackup {
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  drinks: Drink[];
  sources: Source[];
  favorites: Favorite[];
  intakes: Intake[];
  alertnessRatings: AlertnessRating[];
  profile: StoredProfile[];
  settings: Settings[];
}

export async function exportToJson(): Promise<string> {
  const backup: DatabaseBackup = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    drinks: await database.drinks.toArray(),
    sources: await database.sources.toArray(),
    favorites: await database.favorites.toArray(),
    intakes: await database.intakes.toArray(),
    alertnessRatings: await database.alertnessRatings.toArray(),
    profile: await database.profile.toArray(),
    settings: await database.settings.toArray(),
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Replaces every table's contents with the backup's data.
 *
 * Runs inside a single Dexie transaction so a malformed or partially
 * written backup can never leave the database half-replaced: any failure
 * rolls back everything, including the earlier `clear()` calls.
 */
export async function importFromJson(json: string): Promise<void> {
  const backup = parseBackup(json);

  await database.transaction(
    'rw',
    [
      database.drinks,
      database.sources,
      database.favorites,
      database.intakes,
      database.alertnessRatings,
      database.profile,
      database.settings,
    ],
    async () => {
      await Promise.all([
        database.drinks.clear(),
        database.sources.clear(),
        database.favorites.clear(),
        database.intakes.clear(),
        database.alertnessRatings.clear(),
        database.profile.clear(),
        database.settings.clear(),
      ]);

      await Promise.all([
        database.drinks.bulkAdd(backup.drinks),
        database.sources.bulkAdd(backup.sources),
        database.favorites.bulkAdd(backup.favorites),
        database.intakes.bulkAdd(backup.intakes),
        database.alertnessRatings.bulkAdd(backup.alertnessRatings),
        database.profile.bulkAdd(backup.profile),
        database.settings.bulkAdd(backup.settings),
      ]);
    },
  );
}

function parseBackup(json: string): DatabaseBackup {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(json);
  } catch {
    throw new Error('Cannot import backup: input is not valid JSON.');
  }

  if (!isDatabaseBackup(parsedJson)) {
    throw new Error(
      'Cannot import backup: unsupported version or malformed table data.',
    );
  }

  return parsedJson;
}

const BACKUP_TABLE_NAMES = [
  'drinks',
  'sources',
  'favorites',
  'intakes',
  'alertnessRatings',
  'profile',
  'settings',
] as const;

function isDatabaseBackup(value: unknown): value is DatabaseBackup {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== BACKUP_VERSION) return false;

  return BACKUP_TABLE_NAMES.every((tableName) => Array.isArray(candidate[tableName]));
}
